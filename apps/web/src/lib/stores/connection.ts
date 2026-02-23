// ──────────────────────────────────────────────
// WatchSpace — Connection State Store
// ──────────────────────────────────────────────

import { writable } from 'svelte/store';

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected';
  peerCount: number;
  connectedPeerCount: number;
}

const initialState: ConnectionState = {
  status: 'disconnected',
  peerCount: 0,
  connectedPeerCount: 0,
};

export const connectionStore = writable<ConnectionState>(initialState);
