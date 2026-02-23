import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

// Mock uuid before importing stores
vi.mock('$utils/uuid', () => ({
  generateId: () => 'test-uuid-1234',
}));

describe('roomStore', () => {
  let roomStore: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('$stores/room');
    roomStore = mod.roomStore;
  });

  it('has correct initial state', () => {
    const state = get(roomStore);
    expect(state).toEqual({
      roomId: null,
      isHost: false,
      isScreenSharing: false,
      isConnected: false,
    });
  });

  it('sets room id', () => {
    roomStore.setRoomId('abc123');
    expect(get(roomStore).roomId).toBe('abc123');
  });

  it('sets host status', () => {
    roomStore.setHost(true);
    expect(get(roomStore).isHost).toBe(true);
  });

  it('sets screen sharing', () => {
    roomStore.setScreenSharing(true);
    expect(get(roomStore).isScreenSharing).toBe(true);
  });

  it('sets connected status', () => {
    roomStore.setConnected(true);
    expect(get(roomStore).isConnected).toBe(true);
  });

  it('resets to initial state', () => {
    roomStore.setRoomId('abc123');
    roomStore.setHost(true);
    roomStore.setConnected(true);
    roomStore.reset();

    expect(get(roomStore)).toEqual({
      roomId: null,
      isHost: false,
      isScreenSharing: false,
      isConnected: false,
    });
  });
});

describe('peerStore', () => {
  let peerStore: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('$stores/peers');
    peerStore = mod.peerStore;
  });

  it('starts empty', () => {
    expect(get(peerStore)).toEqual([]);
  });

  it('adds a peer', () => {
    peerStore.addPeer({ userId: 'peer-1', displayName: 'Alice' });
    expect(get(peerStore)).toHaveLength(1);
    expect(get(peerStore)[0].userId).toBe('peer-1');
  });

  it('does not add duplicate peers', () => {
    peerStore.addPeer({ userId: 'peer-1', displayName: 'Alice' });
    peerStore.addPeer({ userId: 'peer-1', displayName: 'Alice' });
    expect(get(peerStore)).toHaveLength(1);
  });

  it('removes a peer', () => {
    peerStore.addPeer({ userId: 'peer-1', displayName: 'Alice' });
    peerStore.addPeer({ userId: 'peer-2', displayName: 'Bob' });
    peerStore.removePeer('peer-1');

    const peers = get(peerStore);
    expect(peers).toHaveLength(1);
    expect(peers[0].userId).toBe('peer-2');
  });

  it('updates a peer', () => {
    peerStore.addPeer({ userId: 'peer-1', displayName: 'Alice' });
    peerStore.updatePeer('peer-1', { displayName: 'Alice Updated' });

    expect(get(peerStore)[0].displayName).toBe('Alice Updated');
  });

  it('resets to empty', () => {
    peerStore.addPeer({ userId: 'peer-1', displayName: 'Alice' });
    peerStore.reset();
    expect(get(peerStore)).toEqual([]);
  });
});

describe('chatStore', () => {
  let chatStore: any;
  let sendChatMessage: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('$stores/chat');
    chatStore = mod.chatStore;
    sendChatMessage = mod.sendChatMessage;
  });

  it('starts empty', () => {
    expect(get(chatStore)).toEqual([]);
  });

  it('adds a message', () => {
    chatStore.addMessage({
      id: 'msg-1',
      senderId: 'user-1',
      senderName: 'Alice',
      content: 'Hello!',
      timestamp: 1234567890,
    });

    const msgs = get(chatStore);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('Hello!');
  });

  it('sendChatMessage adds to store with generated id', () => {
    sendChatMessage('Hello world', {
      id: 'user-1',
      displayName: 'Alice',
      avatarColor: '#fff',
      joinedAt: Date.now(),
    });

    const msgs = get(chatStore);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].id).toBe('test-uuid-1234');
    expect(msgs[0].content).toBe('Hello world');
    expect(msgs[0].senderName).toBe('Alice');
  });

  it('resets to empty', () => {
    chatStore.addMessage({
      id: 'msg-1',
      senderId: 'user-1',
      senderName: 'Alice',
      content: 'Hi',
      timestamp: Date.now(),
    });
    chatStore.reset();
    expect(get(chatStore)).toEqual([]);
  });
});
