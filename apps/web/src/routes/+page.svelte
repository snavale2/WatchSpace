<script lang="ts">
  import { goto } from '$app/navigation';
  import { userStore } from '$stores/user';

  let roomIdInput = '';

  async function createRoom() {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: $userStore.id }),
    });
    const data = await res.json();
    if (data.success && data.room) {
      goto(`/room/${data.room.id}`);
    }
  }

  function joinRoom() {
    if (roomIdInput.trim()) {
      goto(`/room/${roomIdInput.trim()}`);
    }
  }
</script>

<svelte:head>
  <title>WatchSpace — Watch Together</title>
  <meta
    name="description"
    content="Create a watch party and enjoy videos with friends in real-time."
  />
</svelte:head>

<main class="min-h-screen flex flex-col items-center justify-center px-4">
  <div class="text-center animate-fade-in">
    <h1
      class="text-5xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent mb-4"
    >
      WatchSpace
    </h1>
    <p class="text-lg text-gray-400 mb-10 max-w-md mx-auto">
      Watch videos together in real-time with friends — no sign-up required.
    </p>
  </div>

  <div class="flex flex-col gap-4 w-full max-w-sm animate-slide-up">
    <button
      on:click={createRoom}
      class="w-full py-3 px-6 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40"
    >
      Create a Room
    </button>

    <div class="flex items-center gap-3">
      <div class="flex-1 h-px bg-surface-border" />
      <span class="text-sm text-gray-500">or</span>
      <div class="flex-1 h-px bg-surface-border" />
    </div>

    <div class="flex gap-2">
      <input
        type="text"
        bind:value={roomIdInput}
        placeholder="Enter room code"
        class="flex-1 px-4 py-3 bg-surface-card border border-surface-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
      />
      <button
        on:click={joinRoom}
        class="px-6 py-3 bg-surface-card border border-surface-border hover:border-brand-500 text-white font-medium rounded-xl transition-all"
      >
        Join
      </button>
    </div>
  </div>
</main>
