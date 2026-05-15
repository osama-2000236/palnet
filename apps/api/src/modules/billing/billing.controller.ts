import {
  BankTransferReceiptBody,
  CheckoutSession,
  CheckoutSessionBody,
  Invoice,
  type CheckoutSession as CheckoutSessionDto,
  type Invoice as InvoiceDto,
} from "@baydar/shared";
import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { RequireCompleteProfile } from "../../common/require-complete-profile.decorator";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";

import { BillingService } from "./billing.service";

const HyperPayWebhookBody = z.record(z.unknown());
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

  @Get("invoices")
  @ApiBearerAuth()
  @RequireCompleteProfile()
  async invoices(@CurrentUser() user: AuthUser): Promise<InvoiceDto[]> {
    return z.array(Invoice).parse(await this.billing.listInvoices(user.id));
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
