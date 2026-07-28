import {
  BankTransferReceiptBody,
  BillingCatalog,
  BillingMe,
  CheckoutSession,
  CheckoutSessionBody,
  CompanyBillingSummary,
  Invoice,
  type BillingCatalog as BillingCatalogDto,
  type BillingMe as BillingMeDto,
  type CheckoutSession as CheckoutSessionDto,
  type CompanyBillingSummary as CompanyBillingSummaryDto,
  type Invoice as InvoiceDto,
} from "@baydar/shared";
import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { CompanyRoleGuard, RequireCompanyRole } from "../companies/guards/company-role.guard";

import { BillingService } from "./billing.service";

const HyperPayWebhookBody = z.record(z.string(), z.unknown());
type HyperPayWebhookBody = z.infer<typeof HyperPayWebhookBody>;

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post("checkout-session")
  @ApiBearerAuth()
  @RequireCompleteProfile()
  async checkout(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CheckoutSessionBody)) body: CheckoutSessionBody,
  ): Promise<CheckoutSessionDto> {
    return CheckoutSession.parse(await this.billing.createCheckoutSession(user.id, body));
  }

  @Get("catalog")
  @ApiBearerAuth()
  @RequireCompleteProfile()
  @Header("Cache-Control", "private, no-store")
  async catalog(@CurrentUser() user: AuthUser): Promise<BillingCatalogDto> {
    return BillingCatalog.parse(await this.billing.getCatalog(user.id));
  }

  @Get("me")
  @ApiBearerAuth()
  @RequireCompleteProfile()
  @Header("Cache-Control", "private, no-store")
  async me(@CurrentUser() user: AuthUser): Promise<BillingMeDto> {
    return BillingMe.parse(await this.billing.getBillingMe(user.id));
  }

  @Post("me/cancel")
  @ApiBearerAuth()
  @RequireCompleteProfile()
  // Idempotent state change that reads the state back — 200, not Nest's POST
  // default of 201; nothing is created.
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "private, no-store")
  async cancel(@CurrentUser() user: AuthUser): Promise<BillingMeDto> {
    return BillingMe.parse(await this.billing.cancelAtPeriodEnd(user.id));
  }

  @Get("invoices")
  @ApiBearerAuth()
  @RequireCompleteProfile()
  @Header("Cache-Control", "private, no-store")
  async invoices(@CurrentUser() user: AuthUser): Promise<InvoiceDto[]> {
    return z.array(Invoice).parse(await this.billing.listInvoices(user.id));
  }

  @Get("companies/:companyId/summary")
  @ApiBearerAuth()
  @RequireCompleteProfile()
  @UseGuards(CompanyRoleGuard)
  @RequireCompanyRole("OWNER", "ADMIN")
  @Header("Cache-Control", "private, no-store")
  async companySummary(@Param("companyId") companyId: string): Promise<CompanyBillingSummaryDto> {
    return CompanyBillingSummary.parse(await this.billing.getCompanyBillingSummary(companyId));
  }

  @Post("invoices/:id/pay-by-transfer")
  @ApiBearerAuth()
  @RequireCompleteProfile()
  async payByTransfer(
    @CurrentUser() user: AuthUser,
    @Param("id") invoiceId: string,
    @Body(new ZodValidationPipe(BankTransferReceiptBody)) body: BankTransferReceiptBody,
  ): Promise<InvoiceDto> {
    return Invoice.parse(await this.billing.submitBankReceipt(user.id, invoiceId, body));
  }

  @Post("webhooks/hyperpay")
  @Public()
  @HttpCode(HttpStatus.OK)
  async hyperpay(
    @Body(new ZodValidationPipe(HyperPayWebhookBody)) body: HyperPayWebhookBody,
    @Headers("x-hyperpay-signature") signature?: string,
  ): Promise<InvoiceDto> {
    return Invoice.parse(await this.billing.handleHyperPayWebhook(body, signature));
  }
}
