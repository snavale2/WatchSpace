// ──────────────────────────────────────────────
// WatchSpace Server — Upstash Redis Client
// ──────────────────────────────────────────────

import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn(
        '⚠️  UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. ' +
        'Using in-memory fallback (not suitable for production).',
    );
}

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:6379',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dev-token',
});
