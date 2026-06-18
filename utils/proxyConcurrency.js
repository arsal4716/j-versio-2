// backend/utils/proxyConcurrency.js
// Per-center proxy concurrency limiter, coordinated across every server/worker
// via Redis. Each center has its own Decodo account with its own thread limit,
// so the cap is keyed by centerId. Slots are tracked as members of a sorted set
// scored by their expiry, so a crashed worker's slot self-heals after the TTL
// instead of leaking capacity forever.
import { getRedisConnection } from "../config/redis.js";
import logger from "./logger.js";

const DEFAULT_LIMIT = Number(process.env.PROXY_MAX_CONCURRENCY || 500);
const SLOT_TTL_MS = Number(process.env.PROXY_SLOT_TTL_MS || 300000); // 5 min safety
const ACQUIRE_TIMEOUT_MS = Number(process.env.PROXY_ACQUIRE_TIMEOUT_MS || 60000);
const RETRY_DELAY_MS = Number(process.env.PROXY_ACQUIRE_RETRY_MS || 750);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const keyFor = (centerId) => `proxy:conc:${centerId}`;

// Atomically: drop expired slots, and if there's room, claim one.
// Returns 1 on success, 0 if the center is at its limit.
const ACQUIRE_LUA = `
local now = tonumber(ARGV[1])
local expiry = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local token = ARGV[4]
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now)
local count = redis.call('ZCARD', KEYS[1])
if count < limit then
  redis.call('ZADD', KEYS[1], expiry, token)
  redis.call('PEXPIRE', KEYS[1], 900000)
  return 1
end
return 0
`;

/**
 * Acquire a proxy slot for a center. Blocks (with retry) until a slot frees up
 * or the timeout elapses, at which point it throws a retryable error so the
 * BullMQ job is re-queued with backoff.
 * @returns {Promise<() => Promise<void>>} a release function
 */
export async function acquireProxySlot(centerId, limit = DEFAULT_LIMIT) {
  const redis = getRedisConnection();
  const key = keyFor(centerId);
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const now = Date.now();
    const ok = await redis.eval(ACQUIRE_LUA, 1, key, now, now + SLOT_TTL_MS, limit, token);
    if (ok === 1) {
      let released = false;
      return async () => {
        if (released) return;
        released = true;
        await redis.zrem(key, token).catch(() => {});
      };
    }
    if (Date.now() >= deadline) {
      const err = new Error(
        `Proxy capacity reached for this center (limit ${limit}). Will retry shortly.`
      );
      err.retryable = true;
      err.statusCode = 429;
      throw err;
    }
    await sleep(RETRY_DELAY_MS);
  }
}

// Current in-flight count for a center (diagnostics).
export async function currentProxyLoad(centerId) {
  try {
    const redis = getRedisConnection();
    const key = keyFor(centerId);
    await redis.zremrangebyscore(key, 0, Date.now());
    return await redis.zcard(key);
  } catch (e) {
    logger.warn("currentProxyLoad failed", { error: e?.message });
    return 0;
  }
}

export default { acquireProxySlot, currentProxyLoad };
