import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import Redis from "ioredis";

import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({
    description: "Liveness probe. Does not touch the DB.",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            uptimeMs: { type: "number" },
            version: { type: "string" },
          },
        },
      },
    },
  })
  check(): { data: { status: "ok"; uptimeMs: number; version: string } } {
    return {
      data: {
        status: "ok",
        uptimeMs: Date.now() - this.startedAt,
        version: process.env.npm_package_version ?? "0.0.0",
      },
    };
  }

  @Get("ready")
  @ApiOkResponse({
    description: "Readiness probe. Verifies DB and optional Redis.",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            status: { type: "string", example: "ready" },
          },
        },
      },
    },
  })
  async ready(): Promise<{ data: { status: "ready" } }> {
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, 1000);

      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        const redis = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });
        try {
          await withTimeout(redis.ping(), 1000);
        } finally {
          redis.disconnect();
        }
      }

      return { data: { status: "ready" } };
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: "NOT_READY",
          message: "Service is not ready.",
        },
      });
    }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
