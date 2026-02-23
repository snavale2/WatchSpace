// ──────────────────────────────────────────────
// WatchSpace Server — Room Manager
// ──────────────────────────────────────────────

import { redis } from '../redis/client';
import { ROOM_LIMITS, type Room } from '@watchspace/shared';

export class RoomManager {
  /** Create a new room and persist it in Redis */
  async createRoom(hostId: string): Promise<Room> {
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      hostId,
      createdAt: Date.now(),
      peers: [hostId],
    };

    await redis.set(`room:${roomId}`, JSON.stringify(room), {
      ex: ROOM_LIMITS.ROOM_TTL_SECONDS,
    });

    return room;
  }

  /** Retrieve a room by ID */
  async getRoom(roomId: string): Promise<Room | null> {
    const data = await redis.get<string>(`room:${roomId}`);
    if (!data) return null;
    return JSON.parse(data) as Room;
  }

  /** Add a peer to a room */
  async joinRoom(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.peers.length >= ROOM_LIMITS.MAX_PEERS) throw new Error('Room is full');
    if (room.peers.includes(userId)) return room;

    room.peers.push(userId);
    await redis.set(`room:${roomId}`, JSON.stringify(room), {
      ex: ROOM_LIMITS.ROOM_TTL_SECONDS,
    });

    return room;
  }

  /** Remove a peer from a room */
  async leaveRoom(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    room.peers = room.peers.filter((id) => id !== userId);

    if (room.peers.length === 0) {
      await redis.del(`room:${roomId}`);
    } else {
      // If the host leaves, transfer to the next peer
      if (room.hostId === userId && room.peers.length > 0) {
        room.hostId = room.peers[0];
      }
      await redis.set(`room:${roomId}`, JSON.stringify(room), {
        ex: ROOM_LIMITS.ROOM_TTL_SECONDS,
      });
    }

    return room;
  }

  /** Generate a short, shareable room ID */
  private generateRoomId(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }
}
