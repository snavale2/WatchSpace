// ──────────────────────────────────────────────
// WatchSpace — MediaSource API Helpers
// ──────────────────────────────────────────────

/**
 * Create a MediaSource-backed object URL for streaming
 * video chunks received via WebRTC data channels.
 */
export function createMediaSourceStream(mimeType: string): {
  url: string;
  appendChunk: (data: ArrayBuffer) => void;
  close: () => void;
} {
  const mediaSource = new MediaSource();
  const url = URL.createObjectURL(mediaSource);

  let sourceBuffer: SourceBuffer | null = null;
  const pendingChunks: ArrayBuffer[] = [];

  mediaSource.addEventListener('sourceopen', () => {
    try {
      sourceBuffer = mediaSource.addSourceBuffer(mimeType);

      sourceBuffer.addEventListener('updateend', () => {
        if (pendingChunks.length > 0 && sourceBuffer && !sourceBuffer.updating) {
          const next = pendingChunks.shift();
          if (next) sourceBuffer.appendBuffer(next);
        }
      });
    } catch (err) {
      console.error('[MediaSource] Failed to add source buffer:', err);
    }
  });

  function appendChunk(data: ArrayBuffer) {
    if (sourceBuffer && !sourceBuffer.updating) {
      sourceBuffer.appendBuffer(data);
    } else {
      pendingChunks.push(data);
    }
  }

  function close() {
    if (mediaSource.readyState === 'open') {
      mediaSource.endOfStream();
    }
    URL.revokeObjectURL(url);
  }

  return { url, appendChunk, close };
}
