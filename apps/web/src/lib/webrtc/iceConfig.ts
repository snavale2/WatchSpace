// ──────────────────────────────────────────────
// WatchSpace — ICE Configuration (Browser-side)
// ──────────────────────────────────────────────

import { ICE_SERVERS } from '@watchspace/shared';

/**
 * Build the RTCConfiguration for WebRTC peer connections.
 * Uses Google STUN servers from the shared package.
 */
export function getIceConfig(): RTCConfiguration {
  return {
    iceServers: [...ICE_SERVERS],
    iceCandidatePoolSize: 10,
  };
}
