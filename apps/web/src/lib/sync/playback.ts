// ──────────────────────────────────────────────
// WatchSpace — Synchronised Playback Controller
// ──────────────────────────────────────────────
//
// Sends play/pause/seek events over WebRTC data channels.
// Only the host can broadcast; guests apply incoming events.
// ──────────────────────────────────────────────

import { SYNC_THRESHOLDS, type SyncEvent, type SyncEventType } from '@watchspace/shared';

/**
 * PlaybackSync keeps all peers' video players in sync.
 *
 * - **Host**: captures local player events and broadcasts them to all peers.
 * - **Guest**: receives sync events and applies them to the local player.
 */
export class PlaybackSync {
  private seekDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressLocal = false;

  constructor(
    private broadcast: (data: string) => void,
    private userId: string,
    private isHost: boolean,
    private getTime: () => number,
    private seekTo: (t: number) => void,
    private playFn: () => void,
    private pauseFn: () => void,
  ) {}

  /** Call when the local user plays the video */
  onLocalPlay() {
    if (!this.isHost || this.suppressLocal) return;
    this.broadcastEvent('play');
  }

  /** Call when the local user pauses the video */
  onLocalPause() {
    if (!this.isHost || this.suppressLocal) return;
    this.broadcastEvent('pause');
  }

  /** Call when the local user seeks */
  onLocalSeek() {
    if (!this.isHost || this.suppressLocal) return;
    // Debounce rapid seeks
    if (this.seekDebounceTimer) clearTimeout(this.seekDebounceTimer);
    this.seekDebounceTimer = setTimeout(() => {
      this.broadcastEvent('seek');
    }, SYNC_THRESHOLDS.SEEK_DEBOUNCE_MS);
  }

  /**
   * Handle an incoming sync event from a remote peer (via data channel).
   * Only guests should apply these events.
   */
  handleRemote(event: SyncEvent) {
    if (event.senderId === this.userId) return;
    if (this.isHost) return; // Hosts don't take sync commands

    // Suppress local event callbacks while applying remote state
    this.suppressLocal = true;

    try {
      // Compensate for network delay
      const networkDelay = (Date.now() - event.timestamp) / 1000; // seconds

      switch (event.type) {
        case 'play': {
          const adjustedTime = event.currentTime + networkDelay;
          this.correctDrift(adjustedTime);
          this.playFn();
          break;
        }
        case 'pause':
          this.correctDrift(event.currentTime);
          this.pauseFn();
          break;
        case 'seek':
          this.seekTo(event.currentTime);
          break;
      }
    } finally {
      // Re-enable local events after a tick
      setTimeout(() => {
        this.suppressLocal = false;
      }, 50);
    }
  }

  /** Destroy — cancel pending timers */
  destroy() {
    if (this.seekDebounceTimer) clearTimeout(this.seekDebounceTimer);
  }

  // ── Private ────────────────────────────────

  private broadcastEvent(type: SyncEventType) {
    const event: SyncEvent = {
      type,
      currentTime: this.getTime(),
      timestamp: Date.now(),
      senderId: this.userId,
    };

    this.broadcast(JSON.stringify({ type: `sync:${type}`, data: event }));
  }

  private correctDrift(remoteTime: number) {
    const drift = Math.abs(this.getTime() - remoteTime);
    if (drift > SYNC_THRESHOLDS.MAX_DRIFT) {
      this.seekTo(remoteTime);
    }
  }
}
