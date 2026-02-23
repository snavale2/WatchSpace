<script lang="ts">
  import { mediaStore } from '$stores/media';

  let videoElement: HTMLVideoElement;

  // Reactively bind screen share stream to video element
  $: if (videoElement && $mediaStore.screenStream) {
    videoElement.srcObject = $mediaStore.screenStream;
  } else if (videoElement) {
    videoElement.srcObject = null;
  }
</script>

{#if $mediaStore.screenSharing && $mediaStore.screenStream}
  <div class="absolute inset-0 z-10 bg-black/90 flex items-center justify-center animate-fade-in">
    <video bind:this={videoElement} autoplay playsinline class="max-w-full max-h-full rounded-lg">
      <track kind="captions" />
    </video>

    <button
      on:click={() => mediaStore.stopScreenShare()}
      class="absolute top-4 right-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
    >
      Stop Sharing
    </button>
  </div>
{/if}
