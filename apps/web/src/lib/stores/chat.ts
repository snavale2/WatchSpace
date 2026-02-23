// ──────────────────────────────────────────────
// WatchSpace — Chat Messages Store
// ──────────────────────────────────────────────

import { writable } from 'svelte/store';
import type { ChatMessage, User } from '@watchspace/shared';
import { generateId } from '$utils/uuid';

function createChatStore() {
  const { subscribe, update, set } = writable<ChatMessage[]>([]);

  return {
    subscribe,
    addMessage: (msg: ChatMessage) => update((msgs) => [...msgs, msg]),
    reset: () => set([]),
  };
}

export const chatStore = createChatStore();

/** Send a chat message (adds locally + dispatches to peers via data channels) */
export function sendChatMessage(content: string, user: User) {
  const msg: ChatMessage = {
    id: generateId(),
    senderId: user.id,
    senderName: user.displayName,
    content,
    timestamp: Date.now(),
  };

  chatStore.addMessage(msg);

  // TODO: Broadcast via WebRTC data channel to all peers
}
