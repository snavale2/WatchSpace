import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
  },
  define: {
    'import.meta.env.VITE_SIGNALING_URL': JSON.stringify(
      process.env.VITE_SIGNALING_URL || 'ws://localhost:3001/ws',
    ),
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:3001/api',
    ),
  },
});
