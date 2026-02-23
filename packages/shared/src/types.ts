// ──────────────────────────────────────────────
// WatchSpace — Shared TypeScript Types
// ──────────────────────────────────────────────

/** Anonymous user represented by a UUID */
export interface User {
  id: string;
  displayName: string;
  avatarColor: string;
  joinedAt: number;
}

/** A watch party room */
export interface Room {
  id: string;
  hostId: string;
  createdAt: number;
  peers: string[];
  videoFileName?: string;
  videoFileSize?: number;
}

/** Chat message sent over data channels */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

/** Playback synchronisation event */
export interface SyncEvent {
  type: SyncEventType;
  currentTime: number;
  timestamp: number;
  senderId: string;
}

export type SyncEventType = 'play' | 'pause' | 'seek' | 'buffer';

/** WebRTC signaling message envelope */
export interface SignalMessage {
  type: SignalMessageType;
  senderId: string;
  targetId: string;
  roomId: string;
  payload: unknown;
}

export type SignalMessageType = 'offer' | 'answer' | 'ice-candidate' | 'renegotiate';

/** Peer connection metadata */
export interface PeerInfo {
  userId: string;
  displayName: string;
  hasCamera: boolean;
  hasMic: boolean;
  isScreenSharing: boolean;
}

/** File chunk sent through WebRTC data channels */
export interface FileChunk {
  fileId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
}

/** File metadata shared before transfer begins */
export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
}

/** Room REST API response */
export interface RoomResponse {
  success: boolean;
  room?: Room;
  error?: string;
}

/** WebSocket event envelope */
export interface WSMessage<T = unknown> {
  event: string;
  data: T;
}

/** Room lifecycle event payload (sent over WS) */
export interface RoomEvent {
  userId: string;
  displayName?: string;
}

/** Sync state snapshot sent to a newly joined peer */
export interface SyncState {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  videoFileName?: string;
}

/** Structured error response over WS */
export interface ErrorResponse {
  code: number;
  message: string;
}

/** Peer list returned by REST or sent on WS join */
export interface RoomPeerList {
  roomId: string;
  peers: PeerInfo[];
}
