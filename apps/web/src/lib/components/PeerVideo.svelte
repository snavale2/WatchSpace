<script lang="ts">
  import type { PeerInfo } from '@watchspace/shared';

  export let peer: PeerInfo;

  let videoElement: HTMLVideoElement;

  /** Attach a remote MediaStream to this tile */
  export function setStream(stream: MediaStream) {
    if (videoElement) {
      videoElement.srcObject = stream;
    }
  }
</script>

<div class="relative w-40 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-surface-card border border-surface-border group">
  <!-- svelte-ignore a11y-media-has-caption -->
  <video
    bind:this={videoElement}
    autoplay
    playsinline
    muted
    class="w-full h-full object-cover"
  />

  <!-- Name overlay -->
  <div class="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent">
    <span class="text-xs text-white font-medium truncate">{peer.displayName}</span>
  </div>

  <!-- Status indicators -->
  <div class="absolute top-1 right-1 flex gap-1">
    {#if !peer.hasMic}
      <span class="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/80 text-[10px]">🔇</span>
    {/if}
    {#if peer.isScreenSharing}
      <span class="w-5 h-5 flex items-center justify-center rounded-full bg-brand-500/80 text-[10px]">🖥</span>
    {/if}
  </div>
</div>
