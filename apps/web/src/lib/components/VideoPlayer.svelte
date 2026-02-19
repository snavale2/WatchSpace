<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type videojs from 'video.js';

  export let src: string = '';
  export let onPlay: ((time: number) => void) | undefined = undefined;
  export let onPause: ((time: number) => void) | undefined = undefined;
  export let onSeek: ((time: number) => void) | undefined = undefined;

  let videoElement: HTMLVideoElement;
  let player: ReturnType<typeof videojs> | null = null;

  onMount(async () => {
    const videojs = (await import('video.js')).default;

    player = videojs(videoElement, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
    });

    player.on('play', () => onPlay?.(player!.currentTime() ?? 0));
    player.on('pause', () => onPause?.(player!.currentTime() ?? 0));
    player.on('seeked', () => onSeek?.(player!.currentTime() ?? 0));
  });

  onDestroy(() => {
    player?.dispose();
  });

  /** Programmatically seek to a time (seconds) */
  export function seekTo(time: number) {
    player?.currentTime(time);
  }

  /** Programmatically play */
  export function play() {
    player?.play();
  }

  /** Programmatically pause */
  export function pause() {
    player?.pause();
  }
</script>

<div class="w-full h-full bg-black rounded-xl overflow-hidden">
  <!-- svelte-ignore a11y-media-has-caption -->
  <video bind:this={videoElement} class="video-js vjs-big-play-centered" {src}>
    <track kind="captions" />
  </video>
</div>
