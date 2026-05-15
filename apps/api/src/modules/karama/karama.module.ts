import { Global, Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";

import { KaramaController } from "./karama.controller";
import { KaramaService } from "./karama.service";

// Global so domain modules (companies/ratings/safety) can inject KaramaService
// without importing this module.
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [KaramaController],
  providers: [KaramaService],
  exports: [KaramaService],
})
export class KaramaModule {}
