<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import VideoPlayer from '$components/VideoPlayer.svelte';
  import Chat from '$components/Chat.svelte';
  import PeerVideo from '$components/PeerVideo.svelte';
  import ScreenShare from '$components/ScreenShare.svelte';
  import RoomControls from '$components/RoomControls.svelte';
  import { roomStore } from '$stores/room';
  import { userStore } from '$stores/user';
  import { peerStore } from '$stores/peers';

  $: roomId = $page.params.id;

  onMount(async () => {
    // Join room via API
    await fetch(`${import.meta.env.VITE_API_URL}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: $userStore.id }),
    });

    roomStore.setRoomId(roomId);

    // TODO: Initialise WebSocket signaling + WebRTC peers
  });

  onDestroy(() => {
    // TODO: Cleanup peers and leave room
  });
</script>

<svelte:head>
  <title>Room {roomId} — WatchSpace</title>
</svelte:head>

<div class="h-screen flex flex-col bg-surface-dark">
  <!-- Top bar -->
  <header class="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-surface-card/50 backdrop-blur-sm">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-brand-400">WatchSpace</h2>
      <span class="text-xs text-gray-500 bg-surface-dark px-2 py-1 rounded-md font-mono">{roomId}</span>
    </div>
    <RoomControls />
  </header>

  <!-- Main content -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Video area -->
    <div class="flex-1 flex flex-col">
      <div class="flex-1 relative">
        <VideoPlayer />
        <ScreenShare />
      </div>

      <!-- Peer video tiles -->
      <div class="flex gap-2 p-2 overflow-x-auto border-t border-surface-border bg-surface-card/30">
        {#each $peerStore as peer (peer.userId)}
          <PeerVideo {peer} />
        {/each}
      </div>
    </div>

    <!-- Chat sidebar -->
    <aside class="w-80 border-l border-surface-border flex-shrink-0 hidden lg:flex">
      <Chat />
    </aside>
  </div>
</div>
