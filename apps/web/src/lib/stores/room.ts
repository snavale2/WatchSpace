// ──────────────────────────────────────────────
// WatchSpace — Room State Store
// ──────────────────────────────────────────────

import { writable } from 'svelte/store';

interface RoomState {
    roomId: string | null;
    isHost: boolean;
    isScreenSharing: boolean;
    isConnected: boolean;
}

const initialState: RoomState = {
    roomId: null,
    isHost: false,
    isScreenSharing: false,
    isConnected: false,
};

function createRoomStore() {
    const { subscribe, update, set } = writable<RoomState>(initialState);

    return {
        subscribe,
        setRoomId: (roomId: string) => update((s) => ({ ...s, roomId })),
        setHost: (isHost: boolean) => update((s) => ({ ...s, isHost })),
        setScreenSharing: (v: boolean) => update((s) => ({ ...s, isScreenSharing: v })),
        setConnected: (v: boolean) => update((s) => ({ ...s, isConnected: v })),
        reset: () => set(initialState),
    };
}

export const roomStore = createRoomStore();
