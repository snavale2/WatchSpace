import { describe, it, expect, vi } from 'vitest';
import { FileReceiver } from '$webrtc/fileTransfer';

// Mock shared constants
vi.mock('@watchspace/shared', () => ({
  FILE_TRANSFER: {
    CHUNK_SIZE: 64 * 1024,
    MAX_FILE_SIZE: 4 * 1024 * 1024 * 1024,
  },
}));

vi.mock('$utils/uuid', () => ({
  generateId: () => 'test-file-id',
}));

/** Helper: create a chunk with a 4-byte index header + data */
function createChunkData(index: number, content: Uint8Array): ArrayBuffer {
  const header = new ArrayBuffer(4);
  new DataView(header).setUint32(0, index);
  const result = new Uint8Array(4 + content.byteLength);
  result.set(new Uint8Array(header), 0);
  result.set(content, 4);
  return result.buffer;
}

describe('FileReceiver', () => {
  it('starts with no metadata and is not complete', () => {
    const receiver = new FileReceiver();
    expect(receiver.isComplete()).toBe(false);
    expect(receiver.assemble()).toBeNull();
  });

  it('accepts metadata', () => {
    const receiver = new FileReceiver();
    receiver.setMetadata({
      fileId: 'file-1',
      fileName: 'video.mp4',
      fileSize: 200,
      mimeType: 'video/mp4',
      totalChunks: 2,
    });
    expect(receiver.isComplete()).toBe(false);
  });

  it('adds chunks and extracts index from header', () => {
    const receiver = new FileReceiver();
    receiver.setMetadata({
      fileId: 'file-1',
      fileName: 'video.mp4',
      fileSize: 200,
      mimeType: 'video/mp4',
      totalChunks: 2,
    });

    const chunk0 = createChunkData(0, new Uint8Array([1, 2, 3]));
    const count = receiver.addChunk(chunk0);
    expect(count).toBe(1);
    expect(receiver.isComplete()).toBe(false);
  });

  it('reports complete when all chunks are received', () => {
    const receiver = new FileReceiver();
    receiver.setMetadata({
      fileId: 'file-1',
      fileName: 'video.mp4',
      fileSize: 6,
      mimeType: 'video/mp4',
      totalChunks: 2,
    });

    receiver.addChunk(createChunkData(0, new Uint8Array([1, 2, 3])));
    receiver.addChunk(createChunkData(1, new Uint8Array([4, 5, 6])));

    expect(receiver.isComplete()).toBe(true);
  });

  it('assembles chunks in correct order into a Blob', () => {
    const receiver = new FileReceiver();
    receiver.setMetadata({
      fileId: 'file-1',
      fileName: 'video.mp4',
      fileSize: 6,
      mimeType: 'video/mp4',
      totalChunks: 3,
    });

    // Add out of order
    receiver.addChunk(createChunkData(2, new Uint8Array([5, 6])));
    receiver.addChunk(createChunkData(0, new Uint8Array([1, 2])));
    receiver.addChunk(createChunkData(1, new Uint8Array([3, 4])));

    const result = receiver.assemble();
    expect(result).not.toBeNull();
    expect(result!.blob).toBeInstanceOf(Blob);
    expect(result!.blob.type).toBe('video/mp4');
    expect(result!.blob.size).toBe(6);
    expect(result!.meta.fileName).toBe('video.mp4');
  });

  it('returns null if assembled before complete', () => {
    const receiver = new FileReceiver();
    receiver.setMetadata({
      fileId: 'file-1',
      fileName: 'test.txt',
      fileSize: 3,
      mimeType: 'text/plain',
      totalChunks: 2,
    });

    receiver.addChunk(createChunkData(0, new Uint8Array([1, 2, 3])));
    expect(receiver.assemble()).toBeNull();
  });

  it('clears chunks when new metadata is set', () => {
    const receiver = new FileReceiver();
    receiver.setMetadata({
      fileId: 'file-1',
      fileName: 'video.mp4',
      fileSize: 3,
      mimeType: 'video/mp4',
      totalChunks: 1,
    });
    receiver.addChunk(createChunkData(0, new Uint8Array([1, 2, 3])));
    expect(receiver.isComplete()).toBe(true);

    // New metadata should reset
    receiver.setMetadata({
      fileId: 'file-2',
      fileName: 'other.mp4',
      fileSize: 6,
      mimeType: 'video/mp4',
      totalChunks: 2,
    });
    expect(receiver.isComplete()).toBe(false);
  });

  it('handles duplicate chunks correctly', () => {
    const receiver = new FileReceiver();
    receiver.setMetadata({
      fileId: 'file-1',
      fileName: 'video.mp4',
      fileSize: 3,
      mimeType: 'video/mp4',
      totalChunks: 1,
    });

    receiver.addChunk(createChunkData(0, new Uint8Array([1, 2, 3])));
    receiver.addChunk(createChunkData(0, new Uint8Array([1, 2, 3]))); // duplicate

    expect(receiver.isComplete()).toBe(true);
    const result = receiver.assemble();
    expect(result!.blob.size).toBe(3);
  });
});
