<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { mediaStore } from '$stores/media';

  const dispatch = createEventDispatcher<{
    cameraToggle: { stream: MediaStream | null };
    micToggle: { stream: MediaStream | null };
    screenShareStart: { stream: MediaStream };
    screenShareStop: undefined;
  }>();

  async function toggleCamera() {
    const stream = await mediaStore.toggleCamera();
    dispatch('cameraToggle', { stream });
  }

  async function toggleMic() {
    const stream = await mediaStore.toggleMic();
    dispatch('micToggle', { stream });
  }

  async function startScreenShare() {
    const stream = await mediaStore.startScreenShare();
    if (stream) {
      dispatch('screenShareStart', { stream });
    }
  }

  function stopScreenShare() {
    mediaStore.stopScreenShare();
    dispatch('screenShareStop');
  }

  function copyRoomLink() {
    navigator.clipboard.writeText(window.location.href);
  }

  function leaveRoom() {
    window.location.href = '/';
  }
</script>

<div class="flex items-center gap-2">
  <button
    on:click={toggleCamera}
    class="p-2 rounded-lg transition-colors {$mediaStore.cameraOn
      ? 'bg-brand-600 text-white'
      : 'bg-surface-dark text-gray-400 hover:text-white'}"
    aria-label={$mediaStore.cameraOn ? 'Turn off camera' : 'Turn on camera'}
  >
    📷
  </button>

  <button
    on:click={toggleMic}
    class="p-2 rounded-lg transition-colors {$mediaStore.micOn
      ? 'bg-brand-600 text-white'
      : 'bg-surface-dark text-gray-400 hover:text-white'}"
    aria-label={$mediaStore.micOn ? 'Mute mic' : 'Unmute mic'}
  >
    🎤
  </button>

  <button
    on:click={$mediaStore.screenSharing ? stopScreenShare : startScreenShare}
    class="p-2 rounded-lg transition-colors {$mediaStore.screenSharing
      ? 'bg-brand-600 text-white'
      : 'bg-surface-dark text-gray-400 hover:text-white'}"
    aria-label={$mediaStore.screenSharing ? 'Stop sharing' : 'Share screen'}
  >
    🖥️
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
