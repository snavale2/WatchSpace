import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { WS_EVENTS } from '@watchspace/shared';
import { RoomManager } from '../src/rooms/manager';
import { InMemoryRedis } from '../src/redis/client';
import { createSignalingRoutes } from '../src/routes/signaling';

describe('WebSocket Signaling', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  let baseUrl: string;
  let redis: InMemoryRedis;
  let roomManager: RoomManager;

  beforeEach(() => {
    redis = new InMemoryRedis();
    roomManager = new RoomManager(redis);

    app = new Elysia().use(createSignalingRoutes(roomManager)).listen(0);

    const port = app.server?.port ?? 0;
    baseUrl = `ws://localhost:${port}`;
  });

  afterEach(() => {
    app.stop();
    redis.clear();
  });

  // ── Helpers ──────────────────────────────────

  function connectWs(userId: string, roomId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${baseUrl}/ws?userId=${userId}&roomId=${roomId}`);
      ws.onopen = () => resolve(ws);
      ws.onerror = (e) => reject(e);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  it('sends peer list on connect', async () => {
    const ws1 = await connectWs('user-1', 'room-1');

    // First message should be the peer list (empty since user-1 is first)
    const peerListMsg = await waitForMessage(ws1);
    expect(peerListMsg.event).toBe(WS_EVENTS.ROOM_PEER_LIST);

    ws1.close();
  });

  it('notifies existing peers when a new peer joins', async () => {
    const ws1 = await connectWs('user-1', 'room-1');
    await waitForMessage(ws1); // peer list

    const joinPromise = waitForMessage(ws1);
    const ws2 = await connectWs('user-2', 'room-1');

    const msg = await joinPromise;
    expect(msg.event).toBe(WS_EVENTS.ROOM_PEER_JOINED);
    expect(msg.data.userId).toBe('user-2');

    ws1.close();
    ws2.close();
  });

  it('notifies remaining peers when a peer leaves', async () => {
    const ws1 = await connectWs('user-1', 'room-1');
    await waitForMessage(ws1); // peer list

    const ws2 = await connectWs('user-2', 'room-1');
    await waitForMessage(ws1); // join notification
    await waitForMessage(ws2); // peer list for ws2

    const leavePromise = waitForMessage(ws1);
    ws2.close();
    const msg = await leavePromise;

    expect(msg.event).toBe(WS_EVENTS.ROOM_PEER_LEFT);
    expect(msg.data.userId).toBe('user-2');

    ws1.close();
  });

  it('broadcasts sync events to other peers in the room', async () => {
    const ws1 = await connectWs('user-1', 'room-1');
    await waitForMessage(ws1); // peer list

    const ws2 = await connectWs('user-2', 'room-1');
    await waitForMessage(ws1); // join notification
    await waitForMessage(ws2); // peer list

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
    await waitForMessage(ws1); // peer list

    const ws2 = await connectWs('user-2', 'room-1');
    await waitForMessage(ws1); // join
    await waitForMessage(ws2); // peer list

    const ws3 = await connectWs('user-3', 'room-1');
    await waitForMessage(ws1); // join user-3
    await waitForMessage(ws2); // join user-3
    await waitForMessage(ws3); // peer list

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
    await waitForMessage(wsRoom1); // peer list

    const wsRoom2 = await connectWs('user-2', 'room-2');
    await waitForMessage(wsRoom2); // peer list

    let received = false;
    wsRoom2.onmessage = () => {
      received = true;
    };

    const ws3 = await connectWs('user-3', 'room-1');
    await waitForMessage(ws3); // peer list
    await new Promise((r) => setTimeout(r, 100));

    expect(received).toBe(false);

    wsRoom1.close();
    wsRoom2.close();
    ws3.close();
  });
});
