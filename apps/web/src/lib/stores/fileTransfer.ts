// ──────────────────────────────────────────────
// WatchSpace — File Transfer State Store
// ──────────────────────────────────────────────

import { writable } from 'svelte/store';

export interface FileTransferState {
  /** Whether we are currently sending a file */
  isSending: boolean;
  /** Whether we are currently receiving a file */
  isReceiving: boolean;
  /** Transfer progress 0–1 */
  progress: number;
  /** File name being transferred */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** URL for the received video (blob or mediasource) */
  receivedVideoUrl: string | null;
  /** Error message if transfer failed */
  error: string | null;
}

const initialState: FileTransferState = {
  isSending: false,
  isReceiving: false,
  progress: 0,
  fileName: '',
  fileSize: 0,
  receivedVideoUrl: null,
  error: null,
};

function createFileTransferStore() {
  const { subscribe, update, set } = writable<FileTransferState>(initialState);

  return {
    subscribe,
    /** Host started sending a file */
    startSending: (fileName: string, fileSize: number) =>
      update((s) => ({ ...s, isSending: true, progress: 0, fileName, fileSize, error: null })),
    /** Update send progress */
    setSendProgress: (progress: number) => update((s) => ({ ...s, progress })),
    /** Send completed */
    doneSending: () => update((s) => ({ ...s, isSending: false, progress: 1 })),
    /** Guest started receiving a file */
    startReceiving: (fileName: string, fileSize: number) =>
      update((s) => ({
        ...s,
        isReceiving: true,
        progress: 0,
        fileName,
        fileSize,
        error: null,
        receivedVideoUrl: null,
      })),
    /** Update receive progress */
    setReceiveProgress: (progress: number) => update((s) => ({ ...s, progress })),
    /** Receive completed — set the video URL */
    doneReceiving: (videoUrl: string) =>
      update((s) => ({ ...s, isReceiving: false, progress: 1, receivedVideoUrl: videoUrl })),
    /** Set a video URL directly (for host's local file) */
    setVideoUrl: (url: string, fileName: string) =>
      update((s) => ({ ...s, receivedVideoUrl: url, fileName })),
    /** Set error */
    setError: (error: string) =>
      update((s) => ({ ...s, isSending: false, isReceiving: false, error })),
    /** Reset */
    reset: () => set(initialState),
  };
}

export const fileTransferStore = createFileTransferStore();
