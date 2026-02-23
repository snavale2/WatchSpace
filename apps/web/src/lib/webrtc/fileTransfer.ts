// ──────────────────────────────────────────────
// WatchSpace — DataChannel File Transfer
// ──────────────────────────────────────────────

import { FILE_TRANSFER, type FileMetadata } from '@watchspace/shared';
import { generateId } from '$utils/uuid';

/**
 * Split a File into chunks and send them over a WebRTC DataChannel.
 *
 * @param file  – the File blob to transfer
 * @param send  – a function that sends a serialised message to the remote peer
 * @param onProgress – optional progress callback (0–1)
 */
export async function sendFile(
  file: File,
  send: (data: ArrayBuffer | string) => void,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  const fileId = generateId();
  const totalChunks = Math.ceil(file.size / FILE_TRANSFER.CHUNK_SIZE);

  // 1. Send metadata
  const meta: FileMetadata = {
    fileId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    totalChunks,
  };
  send(JSON.stringify({ type: 'file:meta', data: meta }));

  // 2. Send chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * FILE_TRANSFER.CHUNK_SIZE;
    const end = Math.min(start + FILE_TRANSFER.CHUNK_SIZE, file.size);
    const chunk = await file.slice(start, end).arrayBuffer();

    // Prefix with chunk index (4 bytes) for ordering
    const header = new ArrayBuffer(4);
    new DataView(header).setUint32(0, i);
    const payload = concatBuffers(header, chunk);

    send(payload);
    onProgress?.((i + 1) / totalChunks);
  }

  // 3. Done
  send(JSON.stringify({ type: 'file:complete', data: { fileId } }));
}

/**
 * Reassemble received file chunks into a Blob.
 */
export class FileReceiver {
  private chunks = new Map<number, ArrayBuffer>();
  private meta: FileMetadata | null = null;

  setMetadata(meta: FileMetadata) {
    this.meta = meta;
    this.chunks.clear();
  }

  /** Get the current metadata (if set) */
  getMetadata(): FileMetadata | null {
    return this.meta;
  }

  /** Get transfer progress (0–1) */
  getProgress(): number {
    if (!this.meta) return 0;
    return this.chunks.size / this.meta.totalChunks;
  }

  addChunk(data: ArrayBuffer): number {
    const view = new DataView(data);
    const index = view.getUint32(0);
    this.chunks.set(index, data.slice(4));
    return this.chunks.size;
  }

  isComplete(): boolean {
    return !!this.meta && this.chunks.size === this.meta.totalChunks;
  }

  assemble(): { blob: Blob; meta: FileMetadata } | null {
    if (!this.meta || !this.isComplete()) return null;

    const sorted: ArrayBuffer[] = [];
    for (let i = 0; i < this.meta.totalChunks; i++) {
      const chunk = this.chunks.get(i);
      if (chunk) sorted.push(chunk);
    }

    const blob = new Blob(sorted, { type: this.meta.mimeType });
    return { blob, meta: this.meta };
  }
}

/** Concatenate two ArrayBuffers */
function concatBuffers(a: ArrayBuffer, b: ArrayBuffer): ArrayBuffer {
  const result = new Uint8Array(a.byteLength + b.byteLength);
  result.set(new Uint8Array(a), 0);
  result.set(new Uint8Array(b), a.byteLength);
  return result.buffer;
}
