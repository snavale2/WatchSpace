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
  import { fileTransferStore } from '$stores/fileTransfer';
  import { SignalingClient } from '$webrtc/signaling';
  import { PeerManager } from '$webrtc/PeerManager';
  import { PlaybackSync } from '$sync/playback';
  import { FILE_TRANSFER } from '@watchspace/shared';

  $: roomId = $page.params.id;

  let signaling: SignalingClient | null = null;
  let peerManager: PeerManager | null = null;
  let playbackSync: PlaybackSync | null = null;
  let fileInput: HTMLInputElement;
  let videoPlayer: VideoPlayer;

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

    // 4. Determine host status — first user in the room is the host
    // The ROOM_PEER_LIST event will tell us if we're alone (host) or joining existing peers (guest)
    signaling.on('room:peer-list', (msg) => {
      const { peers } = msg.data as { peers: string[] };
      const isHost = peers.length === 0;
      roomStore.setHost(isHost);
      console.log(`[Room] Role: ${isHost ? 'HOST' : 'GUEST'}`);

      // 5. Create PlaybackSync now that we know host status
      if (peerManager && !playbackSync) {
        playbackSync = new PlaybackSync(
          (data) => peerManager?.broadcastToAll(data),
          $userStore.id,
          isHost,
          () => videoPlayer?.getCurrentTime?.() ?? 0,
          (t) => videoPlayer?.seekTo(t),
          () => videoPlayer?.play(),
          () => videoPlayer?.pause(),
        );
        peerManager.setPlaybackSync(playbackSync);
      }
    });

    console.log('[Room] PeerManager initialised — waiting for peers');
  });

  onDestroy(() => {
    playbackSync?.destroy();
    playbackSync = null;
    peerManager?.destroy();
    peerManager = null;
    signaling?.disconnect();
    signaling = null;
    roomStore.reset();
    fileTransferStore.reset();
    connectionStore.set({ status: 'disconnected', peerCount: 0, connectedPeerCount: 0 });
    console.log('[Room] Cleaned up');
  });

  /** Handle file selection */
  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowed = FILE_TRANSFER.ALLOWED_MIME_TYPES as readonly string[];
    if (!allowed.includes(file.type)) {
      fileTransferStore.setError(`Unsupported file type: ${file.type}. Use MP4, WebM, or OGG.`);
      return;
    }

    if (file.size > FILE_TRANSFER.MAX_FILE_SIZE) {
      fileTransferStore.setError(
        `File too large. Maximum: ${FILE_TRANSFER.MAX_FILE_SIZE / 1024 / 1024 / 1024} GB`,
      );
      return;
    }

    console.log(`[Room] Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);

    if (peerManager) {
      await peerManager.sendFileToPeers(file);
    } else {
      const url = URL.createObjectURL(file);
      fileTransferStore.setVideoUrl(url, file.name);
    }
  }

  /** VideoPlayer event handlers wired through PlaybackSync */
  function handlePlay(time: number) {
    void time;
    playbackSync?.onLocalPlay();
  }

  function handlePause(time: number) {
    void time;
    playbackSync?.onLocalPause();
  }

  function handleSeek(time: number) {
    void time;
    playbackSync?.onLocalSeek();
  }

  /** Format bytes to human-readable string */
  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
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

      <!-- Host badge -->
      {#if $roomStore.isHost}
        <span class="text-[10px] bg-brand-600/30 text-brand-400 px-1.5 py-0.5 rounded font-semibold"
          >HOST</span
        >
      {/if}
    </div>

    <div class="flex items-center gap-2">
      <!-- File picker button (host only) -->
      {#if $roomStore.isHost}
        <button
          on:click={() => fileInput.click()}
          class="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          disabled={$fileTransferStore.isSending}
        >
          📁 Load Video
        </button>
        <input
          bind:this={fileInput}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/x-matroska"
          on:change={handleFileSelect}
          class="hidden"
        />
      {/if}
      <RoomControls />
    </div>
  </header>

  <!-- Transfer progress bar -->
  {#if $fileTransferStore.isSending || $fileTransferStore.isReceiving}
    <div class="px-4 py-2 bg-surface-card/50 border-b border-surface-border">
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-400">
          {$fileTransferStore.isSending ? '📤 Sending' : '📥 Receiving'}
          <strong class="text-white">{$fileTransferStore.fileName}</strong>
          ({formatBytes($fileTransferStore.fileSize)})
        </span>
        <div class="flex-1 h-1.5 bg-surface-dark rounded-full overflow-hidden">
          <div
            class="h-full bg-brand-500 rounded-full transition-all duration-300"
            style="width: {$fileTransferStore.progress * 100}%"
          ></div>
        </div>
        <span class="text-xs text-brand-400 font-mono">
          {Math.round($fileTransferStore.progress * 100)}%
        </span>
      </div>
    </div>
  {/if}

  <!-- Error banner -->
  {#if $fileTransferStore.error}
    <div class="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
      <span class="text-xs text-red-400">⚠️ {$fileTransferStore.error}</span>
    </div>
  {/if}

  <!-- Main content -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Video area -->
    <div class="flex-1 flex flex-col">
      <div class="flex-1 relative">
        <VideoPlayer
          bind:this={videoPlayer}
          src={$fileTransferStore.receivedVideoUrl ?? ''}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
        />
        <ScreenShare />

        <!-- No video loaded prompt -->
        {#if !$fileTransferStore.receivedVideoUrl && !$fileTransferStore.isReceiving}
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="text-center animate-fade-in">
              <p class="text-4xl mb-3">🎬</p>
              {#if $roomStore.isHost}
                <p class="text-gray-400 text-sm">Load a video to start watching together</p>
                <p class="text-gray-600 text-xs mt-1">MP4, WebM, or OGG • Max 4 GB</p>
              {:else}
                <p class="text-gray-400 text-sm">Waiting for the host to load a video...</p>
              {/if}
            </div>
          </div>
        {/if}
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
