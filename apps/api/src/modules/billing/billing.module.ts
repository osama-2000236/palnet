import { Module } from "@nestjs/common";

import { CompanyRoleGuard } from "../companies/guards/company-role.guard";
import { PrismaModule } from "../prisma/prisma.module";

import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { EmployerEntitlementsService } from "./employer-entitlements.service";
import { FxService } from "./fx.service";
import { HyperPayClient } from "./hyperpay.client";
import { WalletRegistry } from "./wallets";

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    FxService,
    HyperPayClient,
    EmployerEntitlementsService,
    WalletRegistry,
    CompanyRoleGuard,
  ],
  exports: [BillingService, EmployerEntitlementsService],
})
export class BillingModule {}
