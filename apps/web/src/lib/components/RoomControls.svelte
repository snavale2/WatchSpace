<script lang="ts">
  import type { PeerManager } from '$webrtc/PeerManager';
  import { peerStore } from '$stores/peers';
  import { userStore } from '$stores/user';
  import { onDestroy } from 'svelte';

  export let peerManager: PeerManager | null = null;
  export let onShareScreen: () => void = () => {};

  let cameraOn = false;
  let micOn = false;
  let localStream: MediaStream | null = null;

  async function toggleCamera() {
    cameraOn = !cameraOn;
    await updateLocalStream();
  }

  async function toggleMic() {
    micOn = !micOn;
    await updateLocalStream();
  }

  async function updateLocalStream() {
    if (!cameraOn && !micOn) {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        localStream = null;
      }
    } else {
      try {
        if (localStream) {
          localStream.getTracks().forEach((t) => t.stop());
        }
        localStream = await navigator.mediaDevices.getUserMedia({
          video: cameraOn,
          audio: micOn,
        });
      } catch (err) {
        console.error('Failed to get local media:', err);
        cameraOn = false;
        micOn = false;
        if (localStream) {
          localStream.getTracks().forEach((t) => t.stop());
          localStream = null;
        }
      }
    }

    // Update the PeerManager so it streams to everyone
    if (peerManager) {
      peerManager.setLocalStream(localStream || undefined);
    }

    // Update our own peer record in the store so our local tile shows correctly
    if ($userStore?.id) {
      peerStore.updatePeer($userStore.id, {
        hasMic: micOn,
        stream: localStream || undefined,
      });
    }
  }

  onDestroy(() => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
  });

  function copyRoomLink() {
    navigator.clipboard.writeText(window.location.href);
    // TODO: Show a brief toast notification
  }

  function leaveRoom() {
    window.location.href = '/';
  }
</script>

<div class="flex items-center gap-2">
  <button
    on:click={toggleCamera}
    class="p-2 rounded-lg transition-colors {cameraOn
      ? 'bg-brand-600 text-white'
      : 'bg-surface-dark text-gray-400 hover:text-white'}"
    aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
  >
    📷
  </button>

  <button
    on:click={toggleMic}
    class="p-2 rounded-lg transition-colors {micOn
      ? 'bg-brand-600 text-white'
      : 'bg-surface-dark text-gray-400 hover:text-white'}"
    aria-label={micOn ? 'Mute mic' : 'Unmute mic'}
  >
    🎤
  </button>

  <button
    on:click={onShareScreen}
    class="p-2 rounded-lg bg-surface-dark text-gray-400 hover:text-white transition-colors"
    aria-label="Share screen"
  >
    🖥
  </button>

  <button
    on:click={copyRoomLink}
    class="p-2 rounded-lg bg-surface-dark text-gray-400 hover:text-white transition-colors"
    aria-label="Copy room link"
  >
    🔗
  </button>

  <button
    on:click={leaveRoom}
    class="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors"
    aria-label="Leave room"
  >
    ✕
  </button>
</div>
