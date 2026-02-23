/* eslint-disable no-console */
// ──────────────────────────────────────────────
// WatchSpace — Peer Connection Manager
// ──────────────────────────────────────────────
//
// Orchestrates signaling client ↔ simple-peer connections.
// Handles the full WebRTC lifecycle: peer list, offer/answer,
// ICE candidates, join/leave, and cleanup.
// ──────────────────────────────────────────────

import { WS_EVENTS, type WSMessage } from '@watchspace/shared';
import type SimplePeer from 'simple-peer';
import type { SignalingClient } from './signaling';
import { createPeer, signalPeer, destroyPeer, type PeerConnection } from './peer';
import { connectionStore } from '../stores/connection';

export class PeerManager {
  private peers = new Map<string, PeerConnection>();
  private localStream?: MediaStream;

  constructor(
    private signaling: SignalingClient,
    private localUserId: string,
  ) {
    this.setupListeners();
  }

  /** Provide a local media stream to share with peers */
  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  /** Clean up all connections and listeners */
  destroy() {
    for (const conn of this.peers.values()) {
      destroyPeer(conn);
    }
    this.peers.clear();
    this.updateConnectionStore();
    console.log('[PeerManager] Destroyed all peer connections');
  }

  // ── Signaling listeners ─────────────────────

  private setupListeners() {
    // When we join, we get the list of existing peers → initiate connections to each
    this.signaling.on(WS_EVENTS.ROOM_PEER_LIST, (msg: WSMessage) => {
      const { peers } = msg.data as { peers: string[] };
      console.log(`[PeerManager] Received peer list: ${peers.length} existing peers`);

      for (const peerId of peers) {
        if (peerId !== this.localUserId && !this.peers.has(peerId)) {
          this.createConnection(peerId, true); // We are the initiator
        }
      }
    });

    // A new peer joined after us → they will be the non-initiator
    this.signaling.on(WS_EVENTS.ROOM_PEER_JOINED, (msg: WSMessage) => {
      const { userId } = msg.data as { userId: string };
      if (userId === this.localUserId) return;

      console.log(`[PeerManager] New peer joined: ${userId}`);
      // We initiate the connection to the new peer
      if (!this.peers.has(userId)) {
        this.createConnection(userId, true);
      }
    });

    // Peer left → destroy their connection
    this.signaling.on(WS_EVENTS.ROOM_PEER_LEFT, (msg: WSMessage) => {
      const { userId } = msg.data as { userId: string };
      this.removePeer(userId);
    });

    // Signaling: offer received → create non-initiator peer
    this.signaling.on(WS_EVENTS.SIGNAL_OFFER, (msg: WSMessage) => {
      const data = msg.data as { senderId: string; payload: unknown };
      const { senderId, payload } = data;

      if (senderId === this.localUserId) return;

      console.log(`[PeerManager] Received offer from ${senderId}`);

      // If we already have a connection (race condition), destroy and recreate
      if (this.peers.has(senderId)) {
        const existing = this.peers.get(senderId);
        if (existing) destroyPeer(existing);
        this.peers.delete(senderId);
      }

      const conn = this.createConnection(senderId, false);
      signalPeer(conn, payload as SimplePeer.SignalData);
    });

    // Signaling: answer received → feed into existing peer
    this.signaling.on(WS_EVENTS.SIGNAL_ANSWER, (msg: WSMessage) => {
      const data = msg.data as { senderId: string; payload: unknown };
      const { senderId, payload } = data;
      const conn = this.peers.get(senderId);

      if (conn) {
        console.log(`[PeerManager] Received answer from ${senderId}`);
        signalPeer(conn, payload as SimplePeer.SignalData);
      }
    });

    // Signaling: ICE candidate → feed into existing peer
    this.signaling.on(WS_EVENTS.SIGNAL_ICE_CANDIDATE, (msg: WSMessage) => {
      const data = msg.data as { senderId: string; payload: unknown };
      const { senderId, payload } = data;
      const conn = this.peers.get(senderId);

      if (conn) {
        signalPeer(conn, payload as SimplePeer.SignalData);
      }
    });
  }

  // ── Peer connection lifecycle ───────────────

  private createConnection(remoteUserId: string, initiator: boolean): PeerConnection {
    console.log(
      `[PeerManager] Creating ${initiator ? 'initiator' : 'responder'} connection to ${remoteUserId}`,
    );

    const conn = createPeer({
      initiator,
      userId: remoteUserId,
      localStream: this.localStream,
      onSignal: (signalData) => {
        // Determine the event type based on signal data
        let event: string;
        const sd = signalData as { type?: string };
        if (sd.type === 'offer') {
          event = WS_EVENTS.SIGNAL_OFFER;
        } else if (sd.type === 'answer') {
          event = WS_EVENTS.SIGNAL_ANSWER;
        } else {
          event = WS_EVENTS.SIGNAL_ICE_CANDIDATE;
        }

        this.signaling.send(event, {
          senderId: this.localUserId,
          targetId: remoteUserId,
          roomId: this.signaling.roomId,
          payload: signalData,
        });
      },
      onConnect: () => {
        this.updateConnectionStore();
      },
      onStream: (stream) => {
        console.log(`[PeerManager] Received stream from ${remoteUserId}`);
        // TODO: Wire into video player (Step 3+)
        void stream;
      },
      onData: (data) => {
        console.log(`[PeerManager] Data from ${remoteUserId}:`, data.byteLength, 'bytes');
        // TODO: Handle file chunks (Step 4+)
        void data;
      },
      onClose: () => {
        this.removePeer(remoteUserId);
      },
    });

    this.peers.set(remoteUserId, conn);
    this.updateConnectionStore();
    return conn;
  }

  private removePeer(userId: string) {
    const conn = this.peers.get(userId);
    if (conn) {
      destroyPeer(conn);
      this.peers.delete(userId);
      this.updateConnectionStore();
      console.log(`[PeerManager] Removed peer ${userId}`);
    }
  }

  private updateConnectionStore() {
    const connectedCount = Array.from(this.peers.values()).filter((c) => c.connected).length;
    connectionStore.set({
      status:
        this.peers.size > 0 ? (connectedCount > 0 ? 'connected' : 'connecting') : 'disconnected',
      peerCount: this.peers.size,
      connectedPeerCount: connectedCount,
    });
  }
}
