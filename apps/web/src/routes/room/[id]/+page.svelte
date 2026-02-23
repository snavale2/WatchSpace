<script lang="ts">
  /* eslint-disable no-console */
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
  import { connectionStore } from '$stores/connection';
  import { SignalingClient } from '$webrtc/signaling';
  import { PeerManager } from '$webrtc/PeerManager';

  $: roomId = $page.params.id;

  let signaling: SignalingClient | null = null;
  let peerManager: PeerManager | null = null;

  onMount(async () => {
    // 1. Join room via REST API
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: $userStore.id }),
      });
    } catch (err) {
      console.error('[Room] Failed to join via API:', err);
    }

    roomStore.setRoomId(roomId);

    // 2. Connect to signaling server via WebSocket
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
    signaling = new SignalingClient(wsUrl, $userStore.id, roomId);

    try {
      await signaling.connect();
      roomStore.setConnected(true);
      console.log(`[Room] Connected to signaling server for room ${roomId}`);
    } catch (err) {
      console.error('[Room] Failed to connect to signaling server:', err);
      return;
    }

    // 3. Create PeerManager to handle WebRTC connections
    peerManager = new PeerManager(signaling, $userStore.id);
    console.log('[Room] PeerManager initialised — waiting for peers');
  });

  onDestroy(() => {
    // Clean up WebRTC connections
    peerManager?.destroy();
    peerManager = null;

    // Disconnect from signaling server
    signaling?.disconnect();
    signaling = null;

    // Reset stores
    roomStore.reset();
    connectionStore.set({ status: 'disconnected', peerCount: 0, connectedPeerCount: 0 });
    console.log('[Room] Cleaned up');
  });
</script>

<svelte:head>
  <title>Room {roomId} — WatchSpace</title>
</svelte:head>

<div class="h-screen flex flex-col bg-surface-dark">
  <!-- Top bar -->
  <header
    class="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-surface-card/50 backdrop-blur-sm"
  >
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-brand-400">WatchSpace</h2>
      <span class="text-xs text-gray-500 bg-surface-dark px-2 py-1 rounded-md font-mono"
        >{roomId}</span
      >

      <!-- Connection status indicator -->
      <div class="flex items-center gap-1.5">
        {#if $connectionStore.status === 'connected'}
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span class="text-xs text-green-400"
            >{$connectionStore.connectedPeerCount} peer{$connectionStore.connectedPeerCount !== 1
              ? 's'
              : ''}</span
          >
        {:else if $connectionStore.status === 'connecting'}
          <span class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
          <span class="text-xs text-yellow-400">Connecting...</span>
        {:else}
          <span class="w-2 h-2 rounded-full bg-gray-500"></span>
          <span class="text-xs text-gray-500">Waiting</span>
        {/if}
      </div>
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
