import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Public()
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
    description: "Readiness probe. Confirms the API can reach its database.",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            status: { type: "string", example: "ready" },
            database: { type: "string", example: "ok" },
          },
        },
      },
    },
  })
  async ready(): Promise<{ data: { status: "ready"; database: "ok" } }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { data: { status: "ready", database: "ok" } };
  }
}
