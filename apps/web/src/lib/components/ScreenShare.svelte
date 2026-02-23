<script lang="ts">
  import { roomStore } from '$stores/room';

  let screenStream: MediaStream | null = null;
  let videoElement: HTMLVideoElement;

  async function _startScreenShare() {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as Record<string, unknown>,
        audio: true,
      });

      if (videoElement) {
        videoElement.srcObject = screenStream;
      }

      // Stop handler when user clicks browser "Stop sharing"
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      roomStore.setScreenSharing(true);
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }

  function stopScreenShare() {
    screenStream?.getTracks().forEach((t) => t.stop());
    screenStream = null;
    roomStore.setScreenSharing(false);
  }
</script>

{#if screenStream}
  <div class="absolute inset-0 z-10 bg-black/90 flex items-center justify-center animate-fade-in">
    <!-- svelte-ignore a11y-media-has-caption -->
    <video bind:this={videoElement} autoplay playsinline class="max-w-full max-h-full rounded-lg" />

    <button
      on:click={stopScreenShare}
      class="absolute top-4 right-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
    >
      Stop Sharing
    </button>
  </div>
{/if}
