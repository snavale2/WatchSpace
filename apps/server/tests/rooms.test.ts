import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { RoomManager } from '../src/rooms/manager';
import { ROOM_LIMITS } from '@watchspace/shared';

// ── Mock Redis ──────────────────────────────────
const mockStore = new Map<string, string>();

mock.module('../src/redis/client', () => ({
  redis: {
    get: async (key: string) => mockStore.get(key) ?? null,
    set: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
    del: async (key: string) => {
      mockStore.delete(key);
    },
  },
}));

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    mockStore.clear();
    manager = new RoomManager();
  });

  // ── createRoom ────────────────────────────────

  describe('createRoom', () => {
    it('creates a room with the host as first peer', async () => {
      const room = await manager.createRoom('host-1');

      expect(room.hostId).toBe('host-1');
      expect(room.peers).toEqual(['host-1']);
      expect(room.id).toHaveLength(8);
      expect(room.createdAt).toBeGreaterThan(0);
    });

    it('generates unique room ids', async () => {
      const room1 = await manager.createRoom('host-1');
      const room2 = await manager.createRoom('host-2');

      expect(room1.id).not.toBe(room2.id);
    });

    it('persists room to redis', async () => {
      const room = await manager.createRoom('host-1');
      const stored = mockStore.get(`room:${room.id}`);

      expect(stored).toBeDefined();
      expect(JSON.parse(stored!).hostId).toBe('host-1');
    });

    it('generates room ids with only safe characters (no ambiguous chars)', async () => {
      const room = await manager.createRoom('host-1');
      // Should not contain 0, O, I, l (ambiguous chars)
      expect(room.id).not.toMatch(/[0OIl1]/);
    });
  });

  // ── getRoom ───────────────────────────────────

  describe('getRoom', () => {
    it('returns null for non-existent room', async () => {
      const room = await manager.getRoom('nonexistent');
      expect(room).toBeNull();
    });

    it('returns the room when it exists', async () => {
      const created = await manager.createRoom('host-1');
      const fetched = await manager.getRoom(created.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.hostId).toBe('host-1');
    });
  });

  // ── joinRoom ──────────────────────────────────

  describe('joinRoom', () => {
    it('adds a new peer to the room', async () => {
      const room = await manager.createRoom('host-1');
      const updated = await manager.joinRoom(room.id, 'peer-2');

      expect(updated.peers).toEqual(['host-1', 'peer-2']);
    });

    it('does not add duplicate peers', async () => {
      const room = await manager.createRoom('host-1');
      const updated = await manager.joinRoom(room.id, 'host-1');

      expect(updated.peers).toEqual(['host-1']);
    });

    it('throws when room is full', async () => {
      const room = await manager.createRoom('host-1');

      // Fill the room to max
      for (let i = 2; i <= ROOM_LIMITS.MAX_PEERS; i++) {
        await manager.joinRoom(room.id, `peer-${i}`);
      }

      expect(manager.joinRoom(room.id, 'extra-peer')).rejects.toThrow('Room is full');
    });

    it('throws when room does not exist', async () => {
      expect(manager.joinRoom('nonexistent', 'peer-1')).rejects.toThrow('Room not found');
    });
  });

  // ── leaveRoom ─────────────────────────────────

  describe('leaveRoom', () => {
    it('removes a peer from the room', async () => {
      const room = await manager.createRoom('host-1');
      await manager.joinRoom(room.id, 'peer-2');
      const updated = await manager.leaveRoom(room.id, 'peer-2');

      expect(updated.peers).toEqual(['host-1']);
    });

    it('transfers host when host leaves', async () => {
      const room = await manager.createRoom('host-1');
      await manager.joinRoom(room.id, 'peer-2');
      await manager.joinRoom(room.id, 'peer-3');
      const updated = await manager.leaveRoom(room.id, 'host-1');

      expect(updated.hostId).toBe('peer-2');
      expect(updated.peers).not.toContain('host-1');
    });

    it('deletes room when last peer leaves', async () => {
      const room = await manager.createRoom('host-1');
      await manager.leaveRoom(room.id, 'host-1');

      const fetched = await manager.getRoom(room.id);
      expect(fetched).toBeNull();
    });

    it('throws when room does not exist', async () => {
      expect(manager.leaveRoom('nonexistent', 'peer-1')).rejects.toThrow('Room not found');
    });
  });
});
