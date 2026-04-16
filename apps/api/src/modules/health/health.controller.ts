import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  private readonly startedAt = Date.now();

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
}
