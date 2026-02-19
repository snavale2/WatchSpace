<script lang="ts">
  import { roomStore } from '$stores/room';

  let cameraOn = false;
  let micOn = false;

  function toggleCamera() {
    cameraOn = !cameraOn;
    // TODO: Toggle local camera stream via WebRTC peer
  }

  function toggleMic() {
    micOn = !micOn;
    // TODO: Toggle local mic stream via WebRTC peer
  }

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
