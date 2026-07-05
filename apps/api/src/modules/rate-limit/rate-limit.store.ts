import { Injectable, Logger } from "@nestjs/common";
import type { Redis } from "ioredis";

export interface RateLimitResult {
  allowed: boolean;
  resetAt: number;
}

/**
 * Storage backend for a fixed-window rate limiter. Two reasons it's an
 * interface and not just the in-memory class:
 *   1. Redis is the scale-out target (RedisRateLimitStore below) so multiple
 *      API instances share counters.
 *   2. Tests can substitute a fake store with deterministic time.
 * `hit` may be sync (memory) or async (Redis); the guard awaits either.
 */
export interface RateLimitBackend {
  hit(key: string, limit: number, windowMs: number): RateLimitResult | Promise<RateLimitResult>;
  clear(): void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitStore implements RateLimitBackend {
  private readonly buckets = new Map<string, Bucket>();
  // Run a sweep at most once per this interval. Each sweep walks the map
  // and drops entries whose `resetAt` has elapsed so the store doesn't
  // grow without bound under churn.
  private readonly sweepIntervalMs = 60_000;
  private lastSweepAt = 0;

  hit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    this.maybeSweep(now);

    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { allowed: true, resetAt };
    }

    current.count += 1;
    return { allowed: current.count <= limit, resetAt: current.resetAt };
  }

  clear(): void {
    this.buckets.clear();
    this.lastSweepAt = 0;
  }

  /**
   * Lazy eviction. We don't spin a setInterval because tests, AWS Lambda
   * cold starts, and Nest shutdown all hate background timers. Sweeping
   * on the hot path costs O(buckets) once per minute — negligible at the
   * scale this store is designed for.
   */
  private maybeSweep(now: number): void {
    if (now - this.lastSweepAt < this.sweepIntervalMs) return;
    this.lastSweepAt = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

// One round-trip fixed window: INCR, set the window TTL on first hit, and
// repair a missing TTL (possible if a prior client died between INCR and
// PEXPIRE). Returns [count, remaining-ttl-ms].
const HIT_SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {c, ttl}
`;

export class RedisRateLimitStore implements RateLimitBackend {
  private readonly log = new Logger(RedisRateLimitStore.name);

  constructor(private readonly redis: Redis) {}

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    try {
      const [count, ttlMs] = (await this.redis.eval(
        HIT_SCRIPT,
        1,
        `rl:${key}`,
        String(windowMs),
      )) as [number, number];
      return { allowed: count <= limit, resetAt: Date.now() + Math.max(ttlMs, 0) };
    } catch (err) {
      // Fail open: availability beats throttling when Redis is unreachable.
      this.log.warn(`rate-limit hit failed, allowing request: ${(err as Error).message}`);
      return { allowed: true, resetAt: Date.now() + windowMs };
    }
  }

  clear(): void {
    // Test-only affordance on the memory store; Redis keys expire via TTL.
  }
}
