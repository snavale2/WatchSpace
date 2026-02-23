// ──────────────────────────────────────────────
// WatchSpace Server — Entry Point
// ──────────────────────────────────────────────

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { redis } from './redis/client';
import { RoomManager } from './rooms/manager';
import { createRoomRoutes } from './routes/rooms';
import { createSignalingRoutes } from './routes/signaling';

const PORT = Number(process.env['PORT']) || 3001;

// ── Shared dependencies ─────────────────────────
const roomManager = new RoomManager(redis);

// ── App ─────────────────────────────────────────
const app = new Elysia()
  .use(
    cors({
      origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
      methods: ['GET', 'POST', 'DELETE'],
    }),
  )
  .get('/health', () => ({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
  }))
  .use(createRoomRoutes(roomManager))
  .use(createSignalingRoutes(roomManager))
  .listen(PORT);

console.log(`🚀 WatchSpace server running on http://localhost:${PORT}`);
console.log(
  `   Redis: ${process.env['UPSTASH_REDIS_REST_URL'] ? 'Upstash' : 'In-memory fallback'}`,
);
console.log(`   CORS origin: ${process.env['FRONTEND_URL'] || 'http://localhost:5173'}`);

// ── Graceful shutdown ───────────────────────────
process.on('SIGTERM', () => {
  console.log('⏹  Shutting down...');
  app.stop();
  process.exit(0);
});

export type App = typeof app;
