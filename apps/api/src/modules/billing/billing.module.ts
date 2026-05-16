import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";

import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { EmployerEntitlementsService } from "./employer-entitlements.service";
import { HyperPayClient } from "./hyperpay.client";
import { JawwalPayClient } from "./wallets/jawwalpay.client";
import { PalPayClient } from "./wallets/palpay.client";
import { ReflectClient } from "./wallets/reflect.client";
import { WalletRegistry } from "./wallets/wallet-registry";

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    HyperPayClient,
    EmployerEntitlementsService,
    JawwalPayClient,
    PalPayClient,
    ReflectClient,
    WalletRegistry,
  ],
  exports: [BillingService, EmployerEntitlementsService],
})
export class BillingModule {}
