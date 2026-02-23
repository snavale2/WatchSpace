// ──────────────────────────────────────────────
// WatchSpace — Anonymous User Store
// ──────────────────────────────────────────────

import { writable } from 'svelte/store';
import type { User } from '@watchspace/shared';
import { generateId } from '$utils/uuid';

const STORAGE_KEY = 'watchspace_user';

function createUserStore() {
  // Attempt to restore from localStorage
  let initial: User | null = null;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) initial = JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  if (!initial) {
    initial = {
      id: generateId(),
      displayName: `User-${Math.random().toString(36).slice(2, 6)}`,
      avatarColor: randomColor(),
      joinedAt: Date.now(),
    };
  }

  const { subscribe, update } = writable<User>(initial);

  // Persist to localStorage on every change
  subscribe((user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  });

  return {
    subscribe,
    setDisplayName: (name: string) => update((u) => ({ ...u, displayName: name })),
  };
}

function randomColor(): string {
  const colors = ['#748ffc', '#63e6be', '#ffa94d', '#ff6b6b', '#da77f2', '#66d9e8'];
  return colors[Math.floor(Math.random() * colors.length)] ?? '#748ffc';
}

export const userStore = createUserStore();
