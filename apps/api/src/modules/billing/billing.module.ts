import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";

import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { EmployerEntitlementsService } from "./employer-entitlements.service";
import { HyperPayClient } from "./hyperpay.client";

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, HyperPayClient, EmployerEntitlementsService],
  exports: [BillingService, EmployerEntitlementsService],
})
export class BillingModule {}
