// ──────────────────────────────────────────────
// WatchSpace — Synchronised Playback Controller
// ──────────────────────────────────────────────

import { SYNC_THRESHOLDS, WS_EVENTS, type SyncEvent, type SyncEventType } from '@watchspace/shared';
import type { SignalingClient } from '$webrtc/signaling';

/**
 * PlaybackSync keeps all peers' video players in sync.
 *
 * It listens for local player events and broadcasts them,
 * and applies incoming sync events to the local player.
 */
export class PlaybackSync {
  private seekDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private signaling: SignalingClient,
    private userId: string,
    private getTime: () => number,
    private seekTo: (t: number) => void,
    private play: () => void,
    private pause: () => void,
  ) {
    // Listen for incoming sync events
    signaling.on(WS_EVENTS.SYNC_PLAY, (msg) => this.handleRemote(msg.data as SyncEvent));
    signaling.on(WS_EVENTS.SYNC_PAUSE, (msg) => this.handleRemote(msg.data as SyncEvent));
    signaling.on(WS_EVENTS.SYNC_SEEK, (msg) => this.handleRemote(msg.data as SyncEvent));
  }

  /** Call when the local user plays the video */
  onLocalPlay() {
    this.broadcast('play');
  }

  /** Call when the local user pauses the video */
  onLocalPause() {
    this.broadcast('pause');
  }

  /** Call when the local user seeks */
  onLocalSeek() {
    // Debounce rapid seeks
    if (this.seekDebounceTimer) clearTimeout(this.seekDebounceTimer);
    this.seekDebounceTimer = setTimeout(() => {
      this.broadcast('seek');
    }, SYNC_THRESHOLDS.SEEK_DEBOUNCE_MS);
  }

  /** Destroy listeners */
  destroy() {
    if (this.seekDebounceTimer) clearTimeout(this.seekDebounceTimer);
  }

  // ── Private ────────────────────────────────

  private broadcast(type: SyncEventType) {
    const event: SyncEvent = {
      type,
      currentTime: this.getTime(),
      timestamp: Date.now(),
      senderId: this.userId,
    };

    this.signaling.send(`sync:${type}`, event);
  }

  private handleRemote(event: SyncEvent) {
    if (event.senderId === this.userId) return;

    switch (event.type) {
      case 'play':
        this.correctDrift(event.currentTime);
        this.play();
        break;
      case 'pause':
        this.correctDrift(event.currentTime);
        this.pause();
        break;
      case 'seek':
        this.seekTo(event.currentTime);
        break;
    }
  }

  private correctDrift(remoteTime: number) {
    const drift = Math.abs(this.getTime() - remoteTime);
    if (drift > SYNC_THRESHOLDS.MAX_DRIFT) {
      this.seekTo(remoteTime);
    }
  }
}
