import { Logger } from "@nestjs/common";
import type { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import type { Redis } from "ioredis";

// Fixed window + block key, one round trip. Mirrors the semantics of the
// bundled in-memory ThrottlerStorageService: counting stops while blocked,
// block lasts blockDuration ms from the hit that crossed the limit.
// Returns [totalHits, windowTtlMs, isBlocked(0|1), blockTtlMs].
const INCREMENT_SCRIPT = `
local blockTtl = redis.call('PTTL', KEYS[2])
if blockTtl > 0 then
  local hits = tonumber(redis.call('GET', KEYS[1]) or '0')
  local ttl = redis.call('PTTL', KEYS[1])
  if ttl < 0 then ttl = 0 end
  return {hits, ttl, 1, blockTtl}
end
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
if hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  return {hits, ttl, 1, tonumber(ARGV[3])}
end
return {hits, ttl, 0, 0}
`;

/**
 * Redis storage for @nestjs/throttler (auth brute-force limits), so the
 * limits hold exactly across >1 API instance. Bound only when REDIS_URL is
 * set — see ThrottlerModule wiring in app.module.ts. Fail-open like
 * RedisRateLimitStore: availability beats throttling when Redis is down.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly log = new Logger(RedisThrottlerStorage.name);

  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      const [totalHits, ttlMs, blocked, blockTtlMs] = (await this.redis.eval(
        INCREMENT_SCRIPT,
        2,
        `thr:${throttlerName}:${key}`,
        `thr:${throttlerName}:${key}:block`,
        String(ttl),
        String(limit),
        String(blockDuration > 0 ? blockDuration : ttl),
      )) as [number, number, number, number];
      return {
        totalHits,
        timeToExpire: Math.ceil(Math.max(ttlMs, 0) / 1000),
        isBlocked: blocked === 1,
        timeToBlockExpire: Math.ceil(Math.max(blockTtlMs, 0) / 1000),
      };
    } catch (err) {
      this.log.warn(`throttler increment failed, allowing request: ${(err as Error).message}`);
      return {
        totalHits: 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
