// ──────────────────────────────────────────────
// WatchSpace — Peer Connections Store
// ──────────────────────────────────────────────

import { writable } from 'svelte/store';
import type { PeerInfo } from '@watchspace/shared';

function createPeerStore() {
  const { subscribe, update, set } = writable<PeerInfo[]>([]);

  return {
    subscribe,
    addPeer: (peer: PeerInfo) =>
      update((peers) => {
        if (peers.find((p) => p.userId === peer.userId)) return peers;
        return [...peers, peer];
      }),
    removePeer: (userId: string) => update((peers) => peers.filter((p) => p.userId !== userId)),
    updatePeer: (userId: string, data: Partial<PeerInfo>) =>
      update((peers) => peers.map((p) => (p.userId === userId ? { ...p, ...data } : p))),
    reset: () => set([]),
  };
}

export const peerStore = createPeerStore();
