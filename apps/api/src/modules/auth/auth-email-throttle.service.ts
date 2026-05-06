import { ErrorCode } from "@baydar/shared";
import { HttpStatus, Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 5;

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthEmailThrottleService {
  private readonly buckets = new Map<string, Bucket>();

  check(email: string, purpose: "verify-email" | "forgot-password"): void {
    const key = `${purpose}:${email.toLowerCase()}`;
    const now = Date.now();
    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }

    if (existing.count >= LIMIT) {
      throw new DomainException(
        ErrorCode.RATE_LIMITED,
        "Too many email requests. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
  }
}
