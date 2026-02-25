// ──────────────────────────────────────────────
// WatchSpace — simple-peer Wrapper
// ──────────────────────────────────────────────

import SimplePeer from 'simple-peer';
import { getIceConfig } from './iceConfig';

export interface PeerConnection {
  peer: SimplePeer.Instance;
  userId: string;
  connected: boolean;
}

/**
 * Create a new WebRTC peer connection using simple-peer.
 *
 * @param initiator  – true if this side is creating the offer
 * @param userId     – the remote peer's user ID
 * @param localStream – optional local camera/mic MediaStream
 * @param onSignal   – callback to send signaling data to the remote peer via WebSocket
 * @param onStream   – callback when the remote peer's MediaStream is received
 * @param onData     – callback when data is received on a data channel
 * @param onConnect  – callback when the P2P connection is established
 * @param onClose    – callback when the connection closes
 */
export function createPeer({
  initiator,
  userId,
  localStream,
  onSignal,
  onStream,
  onData,
  onConnect,
  onClose,
}: {
  initiator: boolean;
  userId: string;
  localStream?: MediaStream;
  onSignal: (data: SimplePeer.SignalData) => void;
  onStream?: (stream: MediaStream) => void;
  onData?: (data: Uint8Array) => void;
  onConnect?: () => void;
  onClose?: () => void;
}): PeerConnection {
  const peer = new SimplePeer({
    initiator,
    trickle: true,
    stream: localStream,
    config: getIceConfig(),
  });

  const conn: PeerConnection = {
    peer,
    userId,
    connected: false,
  };

  peer.on('signal', onSignal);
  peer.on('stream', (stream) => onStream?.(stream));
  peer.on('data', (data) => onData?.(data));

  peer.on('connect', () => {
    conn.connected = true;
    // eslint-disable-next-line no-console
    console.log(`[Peer:${userId}] ✅ P2P connected`);
    onConnect?.();
  });

  peer.on('close', () => {
    conn.connected = false;
    // eslint-disable-next-line no-console
    console.log(`[Peer:${userId}] Connection closed`);
    onClose?.();
  });

  peer.on('error', (err) => {
    conn.connected = false;
    console.error(`[Peer:${userId}] Error:`, err.message);
    onClose?.();
  });
  return conn;
}

/** Feed a signaling message into an existing peer connection */
export function signalPeer(conn: PeerConnection, signal: SimplePeer.SignalData) {
  if (!conn.peer.destroyed) {
    conn.peer.signal(signal);
  }
}

/** Destroy a peer connection */
export function destroyPeer(conn: PeerConnection) {
  if (!conn.peer.destroyed) {
    conn.peer.destroy();
  }
}

/**
 * Safely add a stream to a peer connection.
 * If tracks are already present, this might require renegotiation depending on the state,
 * but simple-peer handles `addStream` natively.
 */
export function addStreamToPeer(conn: PeerConnection, stream: MediaStream) {
  if (!conn.peer.destroyed && conn.connected) {
    conn.peer.addStream(stream);
  }
}

/** Safely remove a stream from a peer connection */
export function removeStreamFromPeer(conn: PeerConnection, stream: MediaStream) {
  if (!conn.peer.destroyed && conn.connected) {
    conn.peer.removeStream(stream);
  }
}
