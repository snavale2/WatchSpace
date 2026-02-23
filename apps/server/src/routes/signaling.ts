// ──────────────────────────────────────────────
// WatchSpace Server — WebSocket Signaling Routes
// ──────────────────────────────────────────────

import { Elysia } from 'elysia';
import { WS_EVENTS, type SignalMessage, type WSMessage } from '@watchspace/shared';

/** Map of roomId → Set of connected WebSocket clients */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const roomClients = new Map<string, Map<string, any>>();

export const signalingRoutes = new Elysia().ws('/ws', {
  open(ws) {
    const userId = ws.data.query?.userId as string;
    const roomId = ws.data.query?.roomId as string;

    if (!userId || !roomId) {
      ws.send(JSON.stringify({ event: WS_EVENTS.ERROR, data: 'Missing userId or roomId' }));
      ws.close();
      return;
    }

    // Register client in the room
    if (!roomClients.has(roomId)) {
      roomClients.set(roomId, new Map());
    }
    const room = roomClients.get(roomId);
    if (room) room.set(userId, ws);

    // Notify others in the room
    broadcastToRoom(roomId, userId, {
      event: WS_EVENTS.ROOM_PEER_JOINED,
      data: { userId },
    });

    console.log(`[WS] ${userId} joined room ${roomId}`);
  },

  message(ws, message) {
    try {
      const msg = typeof message === 'string' ? JSON.parse(message) : message;
      const { event, data } = msg as WSMessage<SignalMessage>;

      switch (event) {
        case WS_EVENTS.SIGNAL_OFFER:
        case WS_EVENTS.SIGNAL_ANSWER:
        case WS_EVENTS.SIGNAL_ICE_CANDIDATE:
          // Forward signaling message to the target peer
          forwardToPeer(data.roomId, data.targetId, msg);
          break;

        case WS_EVENTS.SYNC_PLAY:
        case WS_EVENTS.SYNC_PAUSE:
        case WS_EVENTS.SYNC_SEEK:
          // Broadcast sync events to all peers in the room
          broadcastToRoom(data.roomId, data.senderId, msg);
          break;

        default:
          console.warn(`[WS] Unknown event: ${event}`);
      }
    } catch (err) {
      console.error('[WS] Failed to handle message:', err);
    }
  },

  close(ws) {
    const userId = ws.data.query?.userId as string;
    const roomId = ws.data.query?.roomId as string;

    if (roomId && userId) {
      const room = roomClients.get(roomId);
      if (room) {
        room.delete(userId);
        if (room.size === 0) {
          roomClients.delete(roomId);
        }
      }

      broadcastToRoom(roomId, userId, {
        event: WS_EVENTS.ROOM_PEER_LEFT,
        data: { userId },
      });

      console.log(`[WS] ${userId} left room ${roomId}`);
    }
  },
});

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
