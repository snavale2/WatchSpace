import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlaybackSync } from '$sync/playback';

// Mock shared constants
vi.mock('@watchspace/shared', () => ({
  SYNC_THRESHOLDS: {
    MAX_DRIFT: 1.5,
    SEEK_DEBOUNCE_MS: 300,
  },
  WS_EVENTS: {
    SYNC_PLAY: 'sync:play',
    SYNC_PAUSE: 'sync:pause',
    SYNC_SEEK: 'sync:seek',
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (msg: any) => void;

function createMockSignaling() {
  const handlers = new Map<string, Handler>();
  return {
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    send: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _trigger: (event: string, data: any) => {
      handlers.get(event)?.({ data });
    },
  };
}

describe('PlaybackSync', () => {
  let signaling: ReturnType<typeof createMockSignaling>;
  let getTime: ReturnType<typeof vi.fn>;
  let seekTo: ReturnType<typeof vi.fn>;
  let play: ReturnType<typeof vi.fn>;
  let pause: ReturnType<typeof vi.fn>;
  let sync: PlaybackSync;

  beforeEach(() => {
    vi.useFakeTimers();
    signaling = createMockSignaling();
    getTime = vi.fn().mockReturnValue(42.5);
    seekTo = vi.fn();
    play = vi.fn();
    pause = vi.fn();
    sync = new PlaybackSync(signaling as any, 'user-1', getTime, seekTo, play, pause);
  });

  afterEach(() => {
    sync.destroy();
    vi.useRealTimers();
  });

  // ── Registration ──────────────────────────────

  it('registers listeners for play, pause, and seek events', () => {
    expect(signaling.on).toHaveBeenCalledWith('sync:play', expect.any(Function));
    expect(signaling.on).toHaveBeenCalledWith('sync:pause', expect.any(Function));
    expect(signaling.on).toHaveBeenCalledWith('sync:seek', expect.any(Function));
  });

  // ── Local events ──────────────────────────────

  it('broadcasts play event on local play', () => {
    sync.onLocalPlay();

    expect(signaling.send).toHaveBeenCalledWith('sync:play', {
      type: 'play',
      currentTime: 42.5,
      timestamp: expect.any(Number),
      senderId: 'user-1',
    });
  });

  it('broadcasts pause event on local pause', () => {
    sync.onLocalPause();

    expect(signaling.send).toHaveBeenCalledWith('sync:pause', {
      type: 'pause',
      currentTime: 42.5,
      timestamp: expect.any(Number),
      senderId: 'user-1',
    });
  });

  it('debounces seek events', () => {
    sync.onLocalSeek();
    sync.onLocalSeek();
    sync.onLocalSeek();

    // Should not have sent yet
    expect(signaling.send).not.toHaveBeenCalled();

    // Advance past debounce
    vi.advanceTimersByTime(300);

    // Should send exactly once
    expect(signaling.send).toHaveBeenCalledTimes(1);
    expect(signaling.send).toHaveBeenCalledWith(
      'sync:seek',
      expect.objectContaining({ type: 'seek' }),
    );
  });

  // ── Remote events ─────────────────────────────

  it('applies remote play and corrects drift', () => {
    getTime.mockReturnValue(40.0); // local time: 40.0, remote: 42.5, drift = 2.5 > 1.5

    signaling._trigger('sync:play', {
      type: 'play',
      currentTime: 42.5,
      timestamp: Date.now(),
      senderId: 'user-2',
    });

    expect(seekTo).toHaveBeenCalledWith(42.5); // drift correction
    expect(play).toHaveBeenCalled();
  });

  it('applies remote pause without drift correction if within threshold', () => {
    getTime.mockReturnValue(42.0); // drift = 0.5 < 1.5

    signaling._trigger('sync:pause', {
      type: 'pause',
      currentTime: 42.5,
      timestamp: Date.now(),
      senderId: 'user-2',
    });

    expect(seekTo).not.toHaveBeenCalled(); // no correction needed
    expect(pause).toHaveBeenCalled();
  });

  it('applies remote seek directly', () => {
    signaling._trigger('sync:seek', {
      type: 'seek',
      currentTime: 120.0,
      timestamp: Date.now(),
      senderId: 'user-2',
    });

    expect(seekTo).toHaveBeenCalledWith(120.0);
  });

  it('ignores events from self', () => {
    signaling._trigger('sync:play', {
      type: 'play',
      currentTime: 42.5,
      timestamp: Date.now(),
      senderId: 'user-1', // same as local user
    });

    expect(play).not.toHaveBeenCalled();
    expect(seekTo).not.toHaveBeenCalled();
  });

  // ── Cleanup ───────────────────────────────────

  it('clears debounce timer on destroy', () => {
    sync.onLocalSeek();
    sync.destroy();

    vi.advanceTimersByTime(1000);
    expect(signaling.send).not.toHaveBeenCalled();
  });
});
