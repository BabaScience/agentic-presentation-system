/* ═══════════════════════════════════════════════════════════════
   Redis Client — Lazy singleton for learner profile persistence.
   Returns null if Redis unavailable (graceful degradation).
   ═══════════════════════════════════════════════════════════════ */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const KEY_PREFIX = 'agentic:learner:';

let client: Redis | null = null;
let initAttempted = false;

export function getRedisClient(): Redis | null {
  if (initAttempted) return client;
  initAttempted = true;
  try {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => (times > 2 ? null : 500),
      lazyConnect: true,
    });
    client.on('error', (err) => {
      console.warn('[Redis] Connection error:', err.message);
    });
    client.on('connect', () => {
      console.log('[Redis] Connected');
    });
  } catch (err: any) {
    console.warn('[Redis] Failed to create client:', err.message);
    client = null;
  }
  return client;
}

export function learnerProfileKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}
