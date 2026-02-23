/* eslint-disable no-console */
// ──────────────────────────────────────────────
// WatchSpace — Peer Connection Manager
// ──────────────────────────────────────────────
//
// Orchestrates signaling client ↔ simple-peer connections.
// Handles the full WebRTC lifecycle: peer list, offer/answer,
// ICE candidates, join/leave, file transfer, and cleanup.
// ──────────────────────────────────────────────

import { WS_EVENTS, type WSMessage, type FileMetadata } from '@watchspace/shared';
import type SimplePeer from 'simple-peer';
import type { SignalingClient } from './signaling';
import { createPeer, signalPeer, destroyPeer, type PeerConnection } from './peer';
import { sendFile, FileReceiver } from './fileTransfer';
import { connectionStore } from '../stores/connection';
import { fileTransferStore } from '../stores/fileTransfer';

export class PeerManager {
  private peers = new Map<string, PeerConnection>();
  private localStream?: MediaStream;
  private fileReceiver = new FileReceiver();
  private receivedVideoUrl: string | null = null;

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

  /** Send a video file to all connected peers via data channels */
  async sendFileToPeers(file: File) {
    const connectedPeers = Array.from(this.peers.values()).filter((c) => c.connected);

    if (connectedPeers.length === 0) {
      console.warn('[PeerManager] No connected peers to send file to');
      // Even with no peers, set the local video URL for the host
      const url = URL.createObjectURL(file);
      fileTransferStore.setVideoUrl(url, file.name);
      return;
    }

    console.log(
      `[PeerManager] Sending "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} MB) to ${connectedPeers.length} peers`,
    );
    fileTransferStore.startSending(file.name, file.size);

    // Set the host's local video URL immediately
    const localUrl = URL.createObjectURL(file);
    fileTransferStore.setVideoUrl(localUrl, file.name);

    try {
      // Send to all connected peers in parallel
      await Promise.all(
        connectedPeers.map((conn) =>
          sendFile(
            file,
            (data) => {
              if (!conn.peer.destroyed && conn.connected) {
                conn.peer.send(data);
              }
            },
            (progress) => {
              fileTransferStore.setSendProgress(progress);
            },
          ),
        ),
      );
      fileTransferStore.doneSending();
      console.log('[PeerManager] File transfer complete');
    } catch (err) {
      console.error('[PeerManager] File transfer failed:', err);
      fileTransferStore.setError('File transfer failed');
    }
  }

  /** Clean up all connections and listeners */
  destroy() {
    for (const conn of this.peers.values()) {
      destroyPeer(conn);
    }
    this.peers.clear();
    this.updateConnectionStore();

    // Revoke any received video URL
    if (this.receivedVideoUrl) {
      URL.revokeObjectURL(this.receivedVideoUrl);
      this.receivedVideoUrl = null;
    }

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

  // ── Data channel message handling ─────────────

  private handleDataMessage(data: Uint8Array) {
    // Try to parse as JSON (metadata/completion messages)
    try {
      const text = new TextDecoder().decode(data);
      const msg = JSON.parse(text) as { type: string; data: unknown };

      if (msg.type === 'file:meta') {
        const meta = msg.data as FileMetadata;
        console.log(`[PeerManager] Receiving file: ${meta.fileName} (${meta.totalChunks} chunks)`);
        this.fileReceiver = new FileReceiver();
        this.fileReceiver.setMetadata(meta);
        fileTransferStore.startReceiving(meta.fileName, meta.fileSize);
        return;
      }

      if (msg.type === 'file:complete') {
        console.log('[PeerManager] File transfer complete — assembling');
        const result = this.fileReceiver.assemble();
        if (result) {
          const url = URL.createObjectURL(result.blob);
          this.receivedVideoUrl = url;
          fileTransferStore.doneReceiving(url);
          console.log(`[PeerManager] Video ready: ${result.meta.fileName}`);
        }
        return;
      }
    } catch {
      // Not JSON — it's a binary chunk
    }

    // Binary chunk data
    this.fileReceiver.addChunk(new Uint8Array(data).buffer as ArrayBuffer);
    fileTransferStore.setReceiveProgress(this.fileReceiver.getProgress());
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
        void stream;
      },
      onData: (data) => {
        this.handleDataMessage(data);
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
