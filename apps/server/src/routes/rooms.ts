// ──────────────────────────────────────────────
// WatchSpace Server — Room REST Routes
// ──────────────────────────────────────────────

import { Elysia, t } from 'elysia';
import type { RoomResponse } from '@watchspace/shared';
import type { RoomManager } from '../rooms/manager';

export function createRoomRoutes(roomManager: RoomManager) {
  return (
    new Elysia({ prefix: '/api/rooms' })
      /** Create a new room */
      .post(
        '/',
        async ({ body }): Promise<RoomResponse> => {
          try {
            const room = await roomManager.createRoom(body.hostId);
            return { success: true, room };
          } catch (error) {
            return { success: false, error: (error as Error).message };
          }
        },
        {
          body: t.Object({
            hostId: t.String(),
          }),
        },
      )

      /** Get room info */
      .get('/:roomId', async ({ params }): Promise<RoomResponse> => {
        try {
          const room = await roomManager.getRoom(params.roomId);
          if (!room) return { success: false, error: 'Room not found' };
          return { success: true, room };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      })

      /** Check if a room exists (lightweight) */
      .get('/:roomId/exists', async ({ params }) => {
        const exists = await roomManager.roomExists(params.roomId);
        return { exists };
      })

      /** Get peer list for a room */
      .get('/:roomId/peers', async ({ params }) => {
        const peers = await roomManager.getRoomPeers(params.roomId);
        return { roomId: params.roomId, peers };
      })

      /** Join a room */
      .post(
        '/:roomId/join',
        async ({ params, body }): Promise<RoomResponse> => {
          try {
            const room = await roomManager.joinRoom(params.roomId, body.userId);
            return { success: true, room };
          } catch (error) {
            return { success: false, error: (error as Error).message };
          }
        },
        {
          body: t.Object({
            userId: t.String(),
          }),
        },
      )

      /** Leave a room */
      .post(
        '/:roomId/leave',
        async ({ params, body }): Promise<RoomResponse> => {
          try {
            const room = await roomManager.leaveRoom(params.roomId, body.userId);
            return { success: true, room };
          } catch (error) {
            return { success: false, error: (error as Error).message };
          }
        },
        {
          body: t.Object({
            userId: t.String(),
          }),
        },
      )
  );
}
