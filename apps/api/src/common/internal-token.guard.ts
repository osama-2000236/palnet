import * as crypto from "node:crypto";

import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

import type { Env } from "../config/env";

@Injectable()
export class InternalTokenGuard implements CanActivate {
  private readonly logger = new Logger(InternalTokenGuard.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("INTERNAL_CRON_TOKEN");
    if (!expected) {
      this.logger.error("INTERNAL_CRON_TOKEN is not configured.");
      throw new UnauthorizedException();
    }
    const req = context.switchToHttp().getRequest<Request>();
    const presented = readHeader(req, "x-internal-token");
    if (!presented) throw new UnauthorizedException();
    if (!constantTimeEqual(presented, expected)) throw new UnauthorizedException();
    return true;
  }
}

function readHeader(req: Request, name: string): string | null {
  const raw = req.headers[name];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === "string" ? raw : null;
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
