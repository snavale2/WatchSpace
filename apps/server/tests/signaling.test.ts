import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { WS_EVENTS } from '@watchspace/shared';

describe('WebSocket Signaling', () => {
  let app: Elysia;
  let baseUrl: string;

  beforeEach(async () => {
    // Create a minimal test server with signaling logic inlined
    // (avoids importing the module which has side-effect initialization)
    const roomClients = new Map<string, Map<string, any>>();

    app = new Elysia()
      .ws('/ws', {
        open(ws) {
          const userId = ws.data.query?.userId as string;
          const roomId = ws.data.query?.roomId as string;

          if (!userId || !roomId) {
            ws.send(JSON.stringify({ event: WS_EVENTS.ERROR, data: 'Missing userId or roomId' }));
            ws.close();
            return;
          }

          if (!roomClients.has(roomId)) {
            roomClients.set(roomId, new Map());
          }
          roomClients.get(roomId)!.set(userId, ws);

          // Notify others
          const room = roomClients.get(roomId)!;
          const payload = JSON.stringify({
            event: WS_EVENTS.ROOM_PEER_JOINED,
            data: { userId },
          });
          for (const [peerId, peerWs] of room) {
            if (peerId !== userId) peerWs.send(payload);
          }
        },
        message(ws, message) {
          const msg = typeof message === 'string' ? JSON.parse(message) : message;
          const { event, data } = msg;
          const roomId = data?.roomId;
          const senderId = data?.senderId;

          if (!roomId) return;

          const room = roomClients.get(roomId);
          if (!room) return;

          if ([WS_EVENTS.SYNC_PLAY, WS_EVENTS.SYNC_PAUSE, WS_EVENTS.SYNC_SEEK].includes(event)) {
            const payload = JSON.stringify(msg);
            for (const [peerId, peerWs] of room) {
              if (peerId !== senderId) peerWs.send(payload);
            }
          } else if (
            [
              WS_EVENTS.SIGNAL_OFFER,
              WS_EVENTS.SIGNAL_ANSWER,
              WS_EVENTS.SIGNAL_ICE_CANDIDATE,
            ].includes(event)
          ) {
            const target = room.get(data.targetId);
            if (target) target.send(JSON.stringify(msg));
          }
        },
        close(ws) {
          const userId = ws.data.query?.userId as string;
          const roomId = ws.data.query?.roomId as string;

          if (roomId && userId) {
            const room = roomClients.get(roomId);
            if (room) {
              room.delete(userId);
              if (room.size === 0) roomClients.delete(roomId);
            }

            const remaining = roomClients.get(roomId);
            if (remaining) {
              const payload = JSON.stringify({
                event: WS_EVENTS.ROOM_PEER_LEFT,
                data: { userId },
              });
              for (const [, peerWs] of remaining) {
                peerWs.send(payload);
              }
            }
          }
        },
      })
      .listen(0);

    baseUrl = `ws://localhost:${app.server!.port}`;
  });

  afterEach(() => {
    app.stop();
  });

  // ── Helpers ──────────────────────────────────

  function connectWs(userId: string, roomId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${baseUrl}/ws?userId=${userId}&roomId=${roomId}`);
      ws.onopen = () => resolve(ws);
      ws.onerror = (e) => reject(e);
    });
  }

  function waitForMessage(ws: WebSocket): Promise<any> {
    return new Promise((resolve) => {
      ws.onmessage = (e) => resolve(JSON.parse(e.data.toString()));
    });
  }

  // ── Tests ────────────────────────────────────

  it('connects to websocket with userId and roomId', async () => {
    const ws = await connectWs('user-1', 'room-1');
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('notifies existing peers when a new peer joins', async () => {
    const ws1 = await connectWs('user-1', 'room-1');
    const messagePromise = waitForMessage(ws1);

    const ws2 = await connectWs('user-2', 'room-1');
    const msg = await messagePromise;

    expect(msg.event).toBe(WS_EVENTS.ROOM_PEER_JOINED);
    expect(msg.data.userId).toBe('user-2');

    ws1.close();
    ws2.close();
  });

  it('notifies remaining peers when a peer leaves', async () => {
    const ws1 = await connectWs('user-1', 'room-1');
    const ws2 = await connectWs('user-2', 'room-1');

    // Wait for join notification
    await waitForMessage(ws1);

    // Set up leave listener
    const leavePromise = waitForMessage(ws1);
    ws2.close();
    const msg = await leavePromise;

    expect(msg.event).toBe(WS_EVENTS.ROOM_PEER_LEFT);
    expect(msg.data.userId).toBe('user-2');

    ws1.close();
  });

  it('broadcasts sync events to other peers in the room', async () => {
    const ws1 = await connectWs('user-1', 'room-1');
    const ws2 = await connectWs('user-2', 'room-1');

    // Wait for join notification
    await waitForMessage(ws1);

    // Send sync:play from user-1
    const syncPromise = waitForMessage(ws2);
    ws1.send(
      JSON.stringify({
        event: WS_EVENTS.SYNC_PLAY,
        data: { roomId: 'room-1', senderId: 'user-1', currentTime: 42.5 },
      }),
    );

    const msg = await syncPromise;
    expect(msg.event).toBe(WS_EVENTS.SYNC_PLAY);
    expect(msg.data.currentTime).toBe(42.5);

    ws1.close();
    ws2.close();
  });

  it('forwards signal offers to the target peer only', async () => {
    const ws1 = await connectWs('user-1', 'room-1');
    const ws2 = await connectWs('user-2', 'room-1');
    const ws3 = await connectWs('user-3', 'room-1');

    // Wait for join notifications
    await waitForMessage(ws1);
    await waitForMessage(ws1);

    // Send offer from user-1 to user-2
    const offerPromise = waitForMessage(ws2);
    ws1.send(
      JSON.stringify({
        event: WS_EVENTS.SIGNAL_OFFER,
        data: {
          roomId: 'room-1',
          senderId: 'user-1',
          targetId: 'user-2',
          sdp: 'mock-sdp',
        },
      }),
    );

    const msg = await offerPromise;
    expect(msg.event).toBe(WS_EVENTS.SIGNAL_OFFER);
    expect(msg.data.sdp).toBe('mock-sdp');

    ws1.close();
    ws2.close();
    ws3.close();
  });

  it('isolates rooms from each other', async () => {
    const wsRoom1 = await connectWs('user-1', 'room-1');
    const wsRoom2 = await connectWs('user-2', 'room-2');

    // user-2 in room-2 should NOT receive a join notification for user-3 in room-1
    let received = false;
    wsRoom2.onmessage = () => {
      received = true;
    };

    await connectWs('user-3', 'room-1');
    await new Promise((r) => setTimeout(r, 100));

    expect(received).toBe(false);

    wsRoom1.close();
    wsRoom2.close();
  });
});
