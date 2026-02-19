// ──────────────────────────────────────────────
// WatchSpace Server — Room Manager Tests
// ──────────────────────────────────────────────

import { describe, it, expect } from 'bun:test';

describe('RoomManager', () => {
    it('should be importable', async () => {
        const { RoomManager } = await import('../src/rooms/manager');
        expect(RoomManager).toBeDefined();
    });

    // TODO: Add integration tests with a mock Redis instance
    it.todo('creates a room and returns a valid room object');
    it.todo('prevents joining a full room');
    it.todo('transfers host when the host leaves');
    it.todo('deletes room when last peer leaves');
});
