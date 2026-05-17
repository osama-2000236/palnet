import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  // gzip JSON responses above 1KB. The threshold keeps tiny payloads
  // (health, mark-read, 204s) uncompressed so we don't pay handshake cost.
  app.use(compression({ threshold: 1024 }));

  const corsOrigins = env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (env.NODE_ENV === "production" && corsOrigins.length === 0) {
    throw new Error(
      "[baydar/api] CORS_ORIGINS must list at least one origin in production. " +
        "Set CORS_ORIGINS=https://baydar.ps,https://www.baydar.ps or similar.",
    );
  }
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("Baydar API")
    .setDescription("Baydar — Arabic-first professional network. REST contract.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(env.API_PORT, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.warn(`[baydar/api] ready on :${env.API_PORT} (${env.NODE_ENV})`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[baydar/api] bootstrap failed:", err);
  process.exit(1);
});
