<script lang="ts">
  import { chatStore, sendChatMessage } from '$stores/chat';
  import { userStore } from '$stores/user';
  import type { ChatMessage } from '@watchspace/shared';

  let messageInput = '';

  function handleSend() {
    const content = messageInput.trim();
    if (!content) return;
    sendChatMessage(content, $userStore);
    messageInput = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="flex flex-col h-full bg-surface-card">
  <!-- Header -->
  <div class="px-4 py-3 border-b border-surface-border">
    <h3 class="text-sm font-semibold text-gray-300">Chat</h3>
  </div>

  <!-- Messages -->
  <div class="flex-1 overflow-y-auto px-4 py-2 space-y-3">
    {#each $chatStore as msg (msg.id)}
      <div class="animate-fade-in">
        <div class="flex items-baseline gap-2">
          <span class="text-xs font-semibold text-brand-400">{msg.senderName}</span>
          <span class="text-[10px] text-gray-600">{formatTime(msg.timestamp)}</span>
        </div>
        <p class="text-sm text-gray-300 break-words">{msg.content}</p>
      </div>
    {/each}
  </div>

  <!-- Input -->
  <div class="p-3 border-t border-surface-border">
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={messageInput}
        on:keydown={handleKeydown}
        placeholder="Type a message..."
        class="flex-1 px-3 py-2 bg-surface-dark border border-surface-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
      />
      <button
        on:click={handleSend}
        class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Send
      </button>
    </div>
  </div>
</div>
