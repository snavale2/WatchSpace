// ──────────────────────────────────────────────
// WatchSpace Server — Upstash Redis Client
// ──────────────────────────────────────────────

import { Redis } from '@upstash/redis';

/**
 * Minimal interface matching the Redis methods we use.
 * Allows swapping in an in-memory store for tests and local dev.
 */
export interface RedisLike {
  get<T = string>(key: string): Promise<T | null>;
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

/**
 * In-memory Redis replacement for local dev and testing.
 * Supports TTL via setTimeout-based expiry.
 */
export class InMemoryRedis implements RedisLike {
  private store = new Map<string, string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  async get<T = string>(key: string): Promise<T | null> {
    const val = this.store.get(key);
    if (val === undefined) return null;
    return val as T;
  }

  async set(key: string, value: string, opts?: { ex?: number }): Promise<string> {
    this.store.set(key, value);

    // Clear any existing TTL timer
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    // Set TTL if provided
    if (opts?.ex) {
      this.timers.set(
        key,
        setTimeout(() => {
          this.store.delete(key);
          this.timers.delete(key);
        }, opts.ex * 1000),
      );
    }

    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    return existed ? 1 : 0;
  }

  /** Clear all data (useful for test teardown) */
  clear(): void {
    this.store.clear();
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}

// ── Create the appropriate client ───────────────

const hasRedisConfig =
  process.env['UPSTASH_REDIS_REST_URL'] && process.env['UPSTASH_REDIS_REST_TOKEN'];

if (!hasRedisConfig) {
  console.warn(
    '⚠️  Redis env vars not set — using in-memory fallback (not suitable for production).',
  );
}

export const redis: RedisLike = hasRedisConfig
  ? new Redis({
      url: process.env['UPSTASH_REDIS_REST_URL'] as string,
      token: process.env['UPSTASH_REDIS_REST_TOKEN'] as string,
    })
  : new InMemoryRedis();
