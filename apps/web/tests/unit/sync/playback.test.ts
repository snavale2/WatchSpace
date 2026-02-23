import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackSync } from '$sync/playback';

// Mock shared constants
vi.mock('@watchspace/shared', () => ({
  SYNC_THRESHOLDS: {
    MAX_DRIFT: 1.5,
    SEEK_DEBOUNCE_MS: 300,
  },
}));

describe('PlaybackSync', () => {
  let broadcast: ReturnType<typeof vi.fn>;
  let getTime: ReturnType<typeof vi.fn>;
  let seekTo: ReturnType<typeof vi.fn>;
  let play: ReturnType<typeof vi.fn>;
  let pause: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    broadcast = vi.fn();
    getTime = vi.fn().mockReturnValue(42.5);
    seekTo = vi.fn();
    play = vi.fn();
    pause = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Host broadcast ─────────────────────────────

  describe('Host', () => {
    let sync: PlaybackSync;

    beforeEach(() => {
      sync = new PlaybackSync(broadcast, 'user-1', true, getTime, seekTo, play, pause);
    });

    afterEach(() => {
      sync.destroy();
    });

    it('broadcasts play event on local play', () => {
      sync.onLocalPlay();

      expect(broadcast).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(broadcast.mock.calls[0][0]);
      expect(sent.type).toBe('sync:play');
      expect(sent.data.type).toBe('play');
      expect(sent.data.currentTime).toBe(42.5);
      expect(sent.data.senderId).toBe('user-1');
    });

    it('broadcasts pause event on local pause', () => {
      sync.onLocalPause();

      expect(broadcast).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(broadcast.mock.calls[0][0]);
      expect(sent.type).toBe('sync:pause');
      expect(sent.data.type).toBe('pause');
    });

    it('debounces seek events', () => {
      sync.onLocalSeek();
      sync.onLocalSeek();
      sync.onLocalSeek();

      expect(broadcast).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(broadcast).toHaveBeenCalledTimes(1);
      const sent = JSON.parse(broadcast.mock.calls[0][0]);
      expect(sent.type).toBe('sync:seek');
    });

    it('clears debounce timer on destroy', () => {
      sync.onLocalSeek();
      sync.destroy();

      vi.advanceTimersByTime(1000);
      expect(broadcast).not.toHaveBeenCalled();
    });

    it('ignores handleRemote events (host does not take sync commands)', () => {
      sync.handleRemote({
        type: 'play',
        currentTime: 50,
        timestamp: Date.now(),
        senderId: 'user-2',
      });

      expect(play).not.toHaveBeenCalled();
      expect(seekTo).not.toHaveBeenCalled();
    });
  });

  // ── Guest receive ──────────────────────────────

  describe('Guest', () => {
    let sync: PlaybackSync;

    beforeEach(() => {
      sync = new PlaybackSync(broadcast, 'user-2', false, getTime, seekTo, play, pause);
    });

    afterEach(() => {
      sync.destroy();
    });

    it('does NOT broadcast on local play (guest cannot control)', () => {
      sync.onLocalPlay();
      expect(broadcast).not.toHaveBeenCalled();
    });

    it('does NOT broadcast on local pause', () => {
      sync.onLocalPause();
      expect(broadcast).not.toHaveBeenCalled();
    });

    it('does NOT broadcast on local seek', () => {
      sync.onLocalSeek();
      vi.advanceTimersByTime(300);
      expect(broadcast).not.toHaveBeenCalled();
    });

    it('applies remote play and corrects drift', () => {
      getTime.mockReturnValue(40.0); // drift = ~2.5 > 1.5

      sync.handleRemote({
        type: 'play',
        currentTime: 42.5,
        timestamp: Date.now(),
        senderId: 'user-1',
      });

      expect(seekTo).toHaveBeenCalled(); // drift correction
      expect(play).toHaveBeenCalled();
    });

    it('applies remote pause without drift correction if within threshold', () => {
      getTime.mockReturnValue(42.0); // drift = 0.5 < 1.5

      sync.handleRemote({
        type: 'pause',
        currentTime: 42.5,
        timestamp: Date.now(),
        senderId: 'user-1',
      });

      expect(seekTo).not.toHaveBeenCalled();
      expect(pause).toHaveBeenCalled();
    });

    it('applies remote seek directly', () => {
      sync.handleRemote({
        type: 'seek',
        currentTime: 120.0,
        timestamp: Date.now(),
        senderId: 'user-1',
      });

      expect(seekTo).toHaveBeenCalledWith(120.0);
    });

    it('ignores events from self', () => {
      sync.handleRemote({
        type: 'play',
        currentTime: 42.5,
        timestamp: Date.now(),
        senderId: 'user-2', // same as local user
      });

      expect(play).not.toHaveBeenCalled();
      expect(seekTo).not.toHaveBeenCalled();
    });
  });
});
