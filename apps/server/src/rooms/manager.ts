// ──────────────────────────────────────────────
// WatchSpace Server — Room Manager
// ──────────────────────────────────────────────

import { ROOM_LIMITS, type Room } from '@watchspace/shared';
import type { RedisLike } from '../redis/client';

export class RoomManager {
  constructor(private redis: RedisLike) {}

  /** Create a new room and persist it in Redis */
  async createRoom(hostId: string): Promise<Room> {
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      hostId,
      createdAt: Date.now(),
      peers: [hostId],
    };

    await this.redis.set(`room:${roomId}`, JSON.stringify(room), {
      ex: ROOM_LIMITS.ROOM_TTL_SECONDS,
    });

    console.log(`[Room] Created ${roomId} by ${hostId}`);
    return room;
  }

  /** Retrieve a room by ID */
  async getRoom(roomId: string): Promise<Room | null> {
    const data = await this.redis.get<string>(`room:${roomId}`);
    if (!data) return null;
    return JSON.parse(data) as Room;
  }

  /** Check if a room exists */
  async roomExists(roomId: string): Promise<boolean> {
    const data = await this.redis.get(`room:${roomId}`);
    return data !== null;
  }

  /** Check if a room is full */
  async isRoomFull(roomId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room) return false;
    return room.peers.length >= ROOM_LIMITS.MAX_PEERS;
  }

  /** Add a peer to a room */
  async joinRoom(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (room.peers.length >= ROOM_LIMITS.MAX_PEERS) throw new Error('Room is full');
    if (room.peers.includes(userId)) return room;

    room.peers.push(userId);
    await this.redis.set(`room:${roomId}`, JSON.stringify(room), {
      ex: ROOM_LIMITS.ROOM_TTL_SECONDS,
    });

    console.log(`[Room] ${userId} joined ${roomId} (${room.peers.length} peers)`);
    return room;
  }

  /** Remove a peer from a room */
  async leaveRoom(roomId: string, userId: string): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    room.peers = room.peers.filter((id) => id !== userId);

    if (room.peers.length === 0) {
      await this.redis.del(`room:${roomId}`);
      console.log(`[Room] ${roomId} deleted (last peer left)`);
    } else {
      // If the host leaves, transfer to the next peer
      if (room.hostId === userId) {
        room.hostId = room.peers[0];
        console.log(`[Room] Host transferred to ${room.hostId} in ${roomId}`);
      }
      await this.redis.set(`room:${roomId}`, JSON.stringify(room), {
        ex: ROOM_LIMITS.ROOM_TTL_SECONDS,
      });
    }

    return room;
  }

  /** Get the list of peer IDs in a room */
  async getRoomPeers(roomId: string): Promise<string[]> {
    const room = await this.getRoom(roomId);
    return room?.peers ?? [];
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
