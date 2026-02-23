// ──────────────────────────────────────────────
// WatchSpace — Local Media Store
// ──────────────────────────────────────────────
// Manages getUserMedia (camera/mic) and getDisplayMedia (screen share).
// Tracks are added/removed from PeerManager connections.
// ──────────────────────────────────────────────

import { writable, get } from 'svelte/store';

export interface MediaState {
  /** Whether camera is active */
  cameraOn: boolean;
  /** Whether mic is active */
  micOn: boolean;
  /** Whether screen sharing is active */
  screenSharing: boolean;
  /** Local camera+mic MediaStream (null if off) */
  localStream: MediaStream | null;
  /** Screen share MediaStream (null if off) */
  screenStream: MediaStream | null;
}

const initialState: MediaState = {
  cameraOn: false,
  micOn: false,
  screenSharing: false,
  localStream: null,
  screenStream: null,
};

function createMediaStore() {
  const { subscribe, update, set } = writable<MediaState>(initialState);

  return {
    subscribe,

    /** Toggle camera on/off */
    async toggleCamera() {
      const state = get({ subscribe });

      if (state.cameraOn && state.localStream) {
        // Turn off — stop video tracks
        state.localStream.getVideoTracks().forEach((t) => t.stop());
        // If mic is also off, stop the whole stream
        if (!state.micOn) {
          state.localStream.getAudioTracks().forEach((t) => t.stop());
          update((s) => ({ ...s, cameraOn: false, localStream: null }));
        } else {
          update((s) => ({ ...s, cameraOn: false }));
        }
        return null;
      }

      // Turn on — get camera (and mic if not already on)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: !state.micOn, // Only request audio if mic isn't already on
        });

        // If we already have a stream with audio, merge tracks
        if (state.localStream && state.micOn) {
          const audioTracks = state.localStream.getAudioTracks();
          audioTracks.forEach((t) => stream.addTrack(t));
        }

        update((s) => ({ ...s, cameraOn: true, localStream: stream }));
        return stream;
      } catch (err) {
        console.error('[Media] Camera access denied:', err);
        return null;
      }
    },

    /** Toggle mic on/off */
    async toggleMic() {
      const state = get({ subscribe });

      if (state.micOn && state.localStream) {
        // Mute — disable audio tracks (don't stop, so we can unmute)
        state.localStream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
        update((s) => ({ ...s, micOn: false }));
        return state.localStream;
      }

      if (state.localStream) {
        // Unmute — re-enable existing audio tracks
        const audioTracks = state.localStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks.forEach((t) => {
            t.enabled = true;
          });
          update((s) => ({ ...s, micOn: true }));
          return state.localStream;
        }
      }

      // No stream yet — get mic only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: state.cameraOn,
          audio: true,
        });

        update((s) => ({ ...s, micOn: true, localStream: stream }));
        return stream;
      } catch (err) {
        console.error('[Media] Mic access denied:', err);
        return null;
      }
    },

    /** Start screen sharing */
    async startScreenShare() {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as Record<string, unknown>,
          audio: true,
        });

        // Handle browser "Stop sharing" button
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            update((s) => ({ ...s, screenSharing: false, screenStream: null }));
          };
        }

        update((s) => ({ ...s, screenSharing: true, screenStream: stream }));
        return stream;
      } catch (err) {
        console.error('[Media] Screen share denied:', err);
        return null;
      }
    },

    /** Stop screen sharing */
    stopScreenShare() {
      const state = get({ subscribe });
      if (state.screenStream) {
        state.screenStream.getTracks().forEach((t) => t.stop());
      }
      update((s) => ({ ...s, screenSharing: false, screenStream: null }));
    },

    /** Stop all media streams */
    stopAll() {
      const state = get({ subscribe });
      if (state.localStream) {
        state.localStream.getTracks().forEach((t) => t.stop());
      }
      if (state.screenStream) {
        state.screenStream.getTracks().forEach((t) => t.stop());
      }
      set(initialState);
    },
  };
}

export const mediaStore = createMediaStore();
