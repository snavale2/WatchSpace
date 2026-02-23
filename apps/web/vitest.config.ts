import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
      $components: path.resolve('./src/lib/components'),
      $stores: path.resolve('./src/lib/stores'),
      $utils: path.resolve('./src/lib/utils'),
      $webrtc: path.resolve('./src/lib/webrtc'),
      $sync: path.resolve('./src/lib/sync'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/lib/utils/**', 'src/lib/sync/**', 'src/lib/webrtc/**', 'src/lib/stores/**'],
      exclude: [
        // Browser/WebRTC-dependent — tested via E2E instead
        'src/lib/webrtc/PeerManager.ts',
        'src/lib/webrtc/peer.ts',
        'src/lib/webrtc/signaling.ts',
        'src/lib/webrtc/iceConfig.ts',
        'src/lib/utils/mediasource.ts',
        'src/lib/stores/user.ts',
        'src/lib/stores/connection.ts',
        'src/lib/stores/fileTransfer.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
