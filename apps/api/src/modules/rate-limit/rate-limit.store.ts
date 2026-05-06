import { Injectable } from "@nestjs/common";

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  hit(key: string, limit: number, windowMs: number): { allowed: boolean; resetAt: number } {
    const now = Date.now();
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
  }
}
