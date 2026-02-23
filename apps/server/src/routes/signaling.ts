// ──────────────────────────────────────────────
// WatchSpace Server — WebSocket Signaling Routes
// ──────────────────────────────────────────────

import { Elysia } from 'elysia';
import { WS_EVENTS, WS_CLOSE_CODES, type WSMessage, type RoomEvent } from '@watchspace/shared';
import type { RoomManager } from '../rooms/manager';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WsClient = any;

/** Map of roomId → Map of userId → WebSocket */
const roomClients = new Map<string, Map<string, WsClient>>();

export function createSignalingRoutes(roomManager: RoomManager) {
  return new Elysia().ws('/ws', {
    open(ws) {
      const userId = ws.data.query?.userId as string | undefined;
      const roomId = ws.data.query?.roomId as string | undefined;

      if (!userId || !roomId) {
        ws.send(
          JSON.stringify({
            event: WS_EVENTS.ERROR,
            data: { code: WS_CLOSE_CODES.MISSING_PARAMS, message: 'Missing userId or roomId' },
          }),
        );
        ws.close();
        return;
      }

      // Register client in the room's WS map
      if (!roomClients.has(roomId)) {
        roomClients.set(roomId, new Map());
      }
      const room = roomClients.get(roomId);
      if (room) room.set(userId, ws);

      // Send existing peer list to the newly joined peer
      const existingPeers: string[] = [];
      if (room) {
        for (const peerId of room.keys()) {
          if (peerId !== userId) existingPeers.push(peerId);
        }
      }
      ws.send(
        JSON.stringify({
          event: WS_EVENTS.ROOM_PEER_LIST,
          data: { roomId, peers: existingPeers },
        }),
      );

      // Notify others that a new peer joined
      broadcastToRoom(roomId, userId, {
        event: WS_EVENTS.ROOM_PEER_JOINED,
        data: { userId } satisfies RoomEvent,
      });

      // Also join in Redis (fire-and-forget, best-effort)
      roomManager.joinRoom(roomId, userId).catch(() => {
        // Room may not exist in Redis yet for WS-only joins — that's fine
      });

      console.log(`[WS] ${userId} joined room ${roomId} (${existingPeers.length + 1} peers)`);
    },

    message(_ws, message) {
      try {
        const raw = typeof message === 'string' ? message : JSON.stringify(message);
        const msg = JSON.parse(raw) as WSMessage<Record<string, unknown>>;
        const { event, data } = msg;

        const roomId = data?.roomId as string | undefined;
        const senderId = data?.senderId as string | undefined;
        const targetId = data?.targetId as string | undefined;

        if (!roomId) return;

        switch (event) {
          case WS_EVENTS.SIGNAL_OFFER:
          case WS_EVENTS.SIGNAL_ANSWER:
          case WS_EVENTS.SIGNAL_ICE_CANDIDATE:
            if (targetId) forwardToPeer(roomId, targetId, msg);
            break;

          case WS_EVENTS.SYNC_PLAY:
          case WS_EVENTS.SYNC_PAUSE:
          case WS_EVENTS.SYNC_SEEK:
          case WS_EVENTS.SYNC_BUFFER:
            if (senderId) broadcastToRoom(roomId, senderId, msg);
            break;

          case WS_EVENTS.CHAT_MESSAGE:
            if (senderId) broadcastToRoom(roomId, senderId, msg);
            break;

          default:
            console.warn(`[WS] Unknown event: ${event}`);
        }
      } catch (err) {
        console.error('[WS] Failed to handle message:', err);
      }
    },

    close(ws) {
      const userId = ws.data.query?.userId as string | undefined;
      const roomId = ws.data.query?.roomId as string | undefined;

      if (roomId && userId) {
        const room = roomClients.get(roomId);
        if (room) {
          room.delete(userId);
          if (room.size === 0) {
            roomClients.delete(roomId);
          }
        }

        // Notify remaining peers
        broadcastToRoom(roomId, userId, {
          event: WS_EVENTS.ROOM_PEER_LEFT,
          data: { userId } satisfies RoomEvent,
        });

        // Also leave in Redis (fire-and-forget)
        roomManager.leaveRoom(roomId, userId).catch(() => {
          // Ignore — room may already be gone
        });

        console.log(`[WS] ${userId} left room ${roomId}`);
      }
    },
  });
}

// ── Helpers ──────────────────────────────────────

function broadcastToRoom(roomId: string, senderId: string, message: WSMessage) {
  const room = roomClients.get(roomId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const [peerId, ws] of room) {
    if (peerId !== senderId) {
      ws.send(payload);
    }
  }
}

function forwardToPeer(roomId: string, targetId: string, message: WSMessage) {
  const room = roomClients.get(roomId);
  if (!room) return;

  const target = room.get(targetId);
  if (target) {
    target.send(JSON.stringify(message));
  }
}
