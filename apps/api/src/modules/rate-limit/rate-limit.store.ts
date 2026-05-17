import { Injectable } from "@nestjs/common";

/**
 * Storage backend for a fixed-window rate limiter. Two reasons it's an
 * interface and not just the in-memory class:
 *   1. Redis is the planned scale-out target — we want to be able to swap
 *      in a Redis implementation without touching every consumer.
 *   2. Tests can substitute a fake store with deterministic time.
 */
export interface RateLimitBackend {
  hit(key: string, limit: number, windowMs: number): { allowed: boolean; resetAt: number };
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

  hit(key: string, limit: number, windowMs: number): { allowed: boolean; resetAt: number } {
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
