// ──────────────────────────────────────────────
// WatchSpace Server — Entry Point
// ──────────────────────────────────────────────

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { roomRoutes } from './routes/rooms';
import { signalingRoutes } from './routes/signaling';

const PORT = Number(process.env.PORT) || 3001;

const app = new Elysia()
    .use(
        cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST', 'DELETE'],
        }),
    )
    .get('/health', () => ({ status: 'ok', timestamp: Date.now() }))
    .use(roomRoutes)
    .use(signalingRoutes)
    .listen(PORT);

console.log(`🚀 WatchSpace server running on http://localhost:${PORT}`);

export type App = typeof app;
