// ──────────────────────────────────────────────
// WatchSpace — Shared Constants
// ──────────────────────────────────────────────

// ── WebSocket Event Names ──────────────────────
export const WS_EVENTS = {
    // Room lifecycle
    ROOM_CREATE: 'room:create',
    ROOM_JOIN: 'room:join',
    ROOM_LEAVE: 'room:leave',
    ROOM_CLOSED: 'room:closed',
    ROOM_PEER_JOINED: 'room:peer-joined',
    ROOM_PEER_LEFT: 'room:peer-left',

    // Signaling
    SIGNAL_OFFER: 'signal:offer',
    SIGNAL_ANSWER: 'signal:answer',
    SIGNAL_ICE_CANDIDATE: 'signal:ice-candidate',

    // Sync
    SYNC_PLAY: 'sync:play',
    SYNC_PAUSE: 'sync:pause',
    SYNC_SEEK: 'sync:seek',
    SYNC_BUFFER: 'sync:buffer',

    // Chat
    CHAT_MESSAGE: 'chat:message',

    // File transfer
    FILE_META: 'file:meta',
    FILE_CHUNK: 'file:chunk',
    FILE_COMPLETE: 'file:complete',

    // Errors
    ERROR: 'error',
} as const;

// ── Room Limits ────────────────────────────────
export const ROOM_LIMITS = {
    MAX_PEERS: 8,
    MAX_ROOM_NAME_LENGTH: 64,
    ROOM_TTL_SECONDS: 60 * 60 * 6, // 6 hours
} as const;

// ── File Transfer ──────────────────────────────
export const FILE_TRANSFER = {
    CHUNK_SIZE: 64 * 1024, // 64 KB per chunk
    MAX_FILE_SIZE: 4 * 1024 * 1024 * 1024, // 4 GB
    ALLOWED_MIME_TYPES: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/x-matroska',
    ],
} as const;

// ── ICE / TURN Configuration ───────────────────
export const ICE_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Metered.ca TURN servers are injected at runtime from env vars
    ],
    iceCandidatePoolSize: 10,
};

// ── Sync Thresholds ────────────────────────────
export const SYNC_THRESHOLDS = {
    /** Max drift (seconds) before forcing a re-sync */
    MAX_DRIFT: 1.5,
    /** Debounce interval (ms) for seek events */
    SEEK_DEBOUNCE_MS: 300,
} as const;

// ── Misc ───────────────────────────────────────
export const APP_NAME = 'WatchSpace';
export const APP_VERSION = '0.1.0';
