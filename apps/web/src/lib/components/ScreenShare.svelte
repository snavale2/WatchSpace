<script lang="ts">
  import { roomStore } from '$stores/room';
  import { peerStore } from '$stores/peers';
  import { userStore } from '$stores/user';
  import type { PeerManager } from '$webrtc/PeerManager';
  import { onDestroy } from 'svelte';

  export let peerManager: PeerManager | null = null;

  let screenStream: MediaStream | null = null;
  let videoElement: HTMLVideoElement;

  $: remotePeerSharing = $peerStore.find((p) => p.isScreenSharing);
  $: activeStream = screenStream || remotePeerSharing?.stream;

  $: if (videoElement && activeStream) {
    videoElement.srcObject = activeStream;
  }

  export const startSharing = async () => {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as Record<string, unknown>,
        audio: true,
      });

      // We handle srcObject reactively now via activeStream

      // Stop handler when user clicks browser "Stop sharing"
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      roomStore.setScreenSharing(true);

      if (peerManager) {
        peerManager.setScreenStream(screenStream);
      }

      if ($userStore.id) {
        peerStore.updatePeer($userStore.id, { isScreenSharing: true });
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  function stopScreenShare() {
    screenStream?.getTracks().forEach((t) => t.stop());
    screenStream = null;
    roomStore.setScreenSharing(false);

    if (peerManager) {
      peerManager.setScreenStream(undefined);
    }

    if ($userStore.id) {
      peerStore.updatePeer($userStore.id, { isScreenSharing: false });
    }
  }

  onDestroy(() => {
    stopScreenShare();
  });
</script>

{#if activeStream}
  <div class="absolute inset-0 z-10 bg-black/90 flex items-center justify-center animate-fade-in">
    <!-- svelte-ignore a11y-media-has-caption -->
    <video bind:this={videoElement} autoplay playsinline class="max-w-full max-h-full rounded-lg" />

    {#if screenStream}
      <button
        on:click={stopScreenShare}
        class="absolute top-4 right-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Stop Sharing
      </button>
    {:else}
      <div
        class="absolute top-4 left-4 px-4 py-2 bg-black/50 backdrop-blur-sm text-white text-sm font-medium rounded-lg pointer-events-none"
      >
        Viewing {remotePeerSharing?.displayName}'s screen
      </div>
    {/if}
  </div>
{/if}
