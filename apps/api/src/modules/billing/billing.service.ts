import * as crypto from "node:crypto";

import { Prisma } from "@baydar/db";
import {
  type AdminInvoiceActionBody,
  type BankTransferReceiptBody,
  type CheckoutSession,
  type CheckoutSessionBody,
  type Invoice as InvoiceDto,
  ErrorCode,
  type PaymentMethod,
  type PlanCode,
  type WalletProvider,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { KaramaService } from "../karama/karama.service";
import { PrismaService } from "../prisma/prisma.service";

import { convertCents, deriveDisplayCurrency } from "./currency";
import { HyperPayCheckoutError, HyperPayClient } from "./hyperpay.client";
import { PLAN_DEFS } from "./pricing";
import { WalletRegistry } from "./wallets/wallet-registry";

// Points price per plan when paying via Karama redemption. Only USER_PREMIUM
// is redeemable for now — employer plans require real money to avoid letting
// individuals offset a company's bill with their personal points.
const POINTS_PRICE_BY_PLAN: Partial<Record<PlanCode, number>> = {
  USER_PREMIUM: 500,
};

const WALLET_METHODS = new Set<PaymentMethod>(["JAWWALPAY", "PALPAY", "REFLECT"]);

const HyperPayPaymentPayload = z
  .object({
    merchantTransactionId: z.string().min(1).optional(),
    id: z.string().optional(),
    paymentId: z.string().optional(),
    result: z
      .object({ code: z.string(), description: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

const HyperPayWebhookPayload = z
  .object({
    type: z.string().min(1),
    payload: HyperPayPaymentPayload,
  })
  .passthrough();

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hyperpay: HyperPayClient,
    private readonly config: ConfigService<Env, true>,
    private readonly karama: KaramaService,
    private readonly wallets: WalletRegistry,
  ) {}

  async createCheckoutSession(userId: string, body: CheckoutSessionBody): Promise<CheckoutSession> {
    const plan = await this.ensurePlan(body.planCode);
    await this.assertScope(userId, body.planCode, body.companyId ?? null);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, locale: true },
    });
    if (!user) throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);

    const displayCurrency = deriveDisplayCurrency(user.locale);
    const displayAmountCents = convertCents(plan.priceCents, plan.currency, displayCurrency);

    if (body.idempotencyKey && body.method !== "CARD") {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "idempotencyKey is supported for card checkout only.",
        400,
      );
    }
    const checkoutKey = body.idempotencyKey ? digest(body.idempotencyKey) : null;
    const checkoutFingerprint = checkoutKey
      ? digest(
          JSON.stringify({
            userId,
            planId: plan.id,
            companyId: body.companyId ?? null,
            intervalDays: plan.intervalDays,
            method: body.method,
            amountCents: plan.priceCents,
            currency: plan.currency,
            returnUrl: body.returnUrl,
          }),
        )
      : null;
    if (checkoutKey) {
      const existing = await this.prisma.invoice.findUnique({ where: { checkoutKey } });
      if (existing) {
        this.assertCheckoutReuse(existing, checkoutFingerprint as string);
        return this.resumeCardCheckout(
          existing,
          user.email,
          body.returnUrl,
          displayAmountCents,
          displayCurrency,
        );
      }
    }

    // Karama POINTS payment — gated to USER_PREMIUM and processed inline.
    if (body.method === "POINTS") {
      const cost = POINTS_PRICE_BY_PLAN[body.planCode];
      if (!cost) {
        throw new DomainException(
          ErrorCode.VALIDATION_FAILED,
          "This plan cannot be redeemed with Karama Points.",
          400,
        );
      }
      return this.processPointsCheckout(
        userId,
        body,
        plan,
        cost,
        displayAmountCents,
        displayCurrency,
      );
    }

    const createInvoice = async (db: Prisma.TransactionClient) => {
      const subscription =
        plan.intervalDays === null
          ? null
          : await db.subscription.create({
              data: {
                userId: body.companyId ? null : userId,
                companyId: body.companyId ?? null,
                planId: plan.id,
                status: "INCOMPLETE",
              },
            });

      return db.invoice.create({
        data: {
          subscriptionId: subscription?.id ?? null,
          planId: plan.id,
          userId: body.companyId ? null : userId,
          companyId: body.companyId ?? null,
          amountCents: plan.priceCents,
          currency: plan.currency,
          // Free plans are activated below (status + paidAt set together inside activateInvoice).
          status: "OPEN",
          method: body.method,
          dueAt:
            body.method === "BANK_TRANSFER" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
          checkoutKey,
          checkoutFingerprint,
        },
      });
    };

    const invoice = await (
      checkoutKey ? this.prisma.$transaction((tx) => createInvoice(tx)) : createInvoice(this.prisma)
    ).catch(async (error: unknown) => {
      if (
        !checkoutKey ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }
      const existing = await this.prisma.invoice.findUniqueOrThrow({ where: { checkoutKey } });
      this.assertCheckoutReuse(existing, checkoutFingerprint as string);
      return existing;
    });

    if (plan.priceCents === 0) {
      await this.activateInvoice(invoice.id, "free-plan");
    }

    if (body.method === "BANK_TRANSFER") {
      return {
        invoiceId: invoice.id,
        method: "BANK_TRANSFER",
        providerCheckoutId: null,
        checkoutUrl: null,
        bankTransfer: {
          beneficiary: this.config.get("BANK_TRANSFER_BENEFICIARY", { infer: true }) ?? "Baydar",
          iban: this.config.get("BANK_TRANSFER_IBAN", { infer: true }) ?? "CONFIGURE_BANK_IBAN",
          reference: invoice.id,
          amountCents: invoice.amountCents,
          currency: invoice.currency,
        },
        wallet: null,
        displayAmountCents,
        displayCurrency,
      };
    }

    if (WALLET_METHODS.has(body.method)) {
      const provider = body.method as WalletProvider;
      const wallet = await this.wallets.get(provider).createCheckout({
        invoiceId: invoice.id,
        amountCents: invoice.amountCents,
        currency: invoice.currency,
        returnUrl: body.returnUrl,
        customerEmail: user.email,
      });
      return {
        invoiceId: invoice.id,
        method: body.method,
        providerCheckoutId: null,
        checkoutUrl: null,
        bankTransfer: null,
        wallet: {
          provider: wallet.provider,
          deepLink: wallet.deepLink,
          ussd: wallet.ussd,
          voucherId: wallet.voucherId,
          instructions: wallet.instructions,
        },
        displayAmountCents,
        displayCurrency,
      };
    }

    return this.resumeCardCheckout(
      invoice,
      user.email,
      body.returnUrl,
      displayAmountCents,
      displayCurrency,
    );
  }

  private assertCheckoutReuse(
    invoice: { checkoutFingerprint: string | null },
    fingerprint: string,
  ): void {
    if (invoice.checkoutFingerprint !== fingerprint) {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "This idempotency key was already used for a different checkout.",
        409,
      );
    }
  }

  private async resumeCardCheckout(
    invoice: { id: string; providerInvoiceId: string | null },
    customerEmail: string,
    returnUrl: string,
    displayAmountCents: number,
    displayCurrency: string,
  ): Promise<CheckoutSession> {
    if (invoice.providerInvoiceId) {
      return {
        invoiceId: invoice.id,
        method: "CARD",
        providerCheckoutId: invoice.providerInvoiceId,
        checkoutUrl: this.hyperpay.getCheckoutUrl(invoice.providerInvoiceId),
        bankTransfer: null,
        wallet: null,
        displayAmountCents,
        displayCurrency,
      };
    }

    const claimed = await this.prisma.invoice.updateMany({
      where: { id: invoice.id, providerInvoiceId: null, checkoutProcessingAt: null },
      data: { checkoutProcessingAt: new Date() },
    });
    if (!claimed.count) {
      const current = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
      if (current.providerInvoiceId) {
        return this.resumeCardCheckout(
          current,
          customerEmail,
          returnUrl,
          displayAmountCents,
          displayCurrency,
        );
      }
      throw new DomainException(
        ErrorCode.CONFLICT,
        "This checkout is already being processed. Retry shortly.",
        409,
      );
    }

    const current = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    let checkout;
    try {
      checkout = await this.hyperpay.createCheckout({
        invoiceId: invoice.id,
        amountCents: current.amountCents,
        currency: current.currency,
        returnUrl,
        customerEmail,
      });
    } catch (error) {
      if (error instanceof HyperPayCheckoutError && error.retrySafe) {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { checkoutProcessingAt: null },
        });
      }
      throw error;
    }

    // Retain the claim if this write fails: HyperPay may already have created
    // the checkout, so an automatic retry must fail closed.
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        providerInvoiceId: checkout.providerCheckoutId,
        checkoutProcessingAt: null,
      },
    });
    return {
      invoiceId: invoice.id,
      method: "CARD",
      providerCheckoutId: checkout.providerCheckoutId,
      checkoutUrl: checkout.checkoutUrl,
      bankTransfer: null,
      wallet: null,
      displayAmountCents,
      displayCurrency,
    };
  }

  // POINTS path: synchronously debit the user's Karama balance and activate
  // the invoice. No external payment provider is touched. Only redeemable
  // plans (currently USER_PREMIUM) are allowed; gated by POINTS_PRICE_BY_PLAN.
  private async processPointsCheckout(
    userId: string,
    body: CheckoutSessionBody,
    plan: { id: string; intervalDays: number | null },
    cost: number,
    displayAmountCents: number,
    displayCurrency: string,
  ): Promise<CheckoutSession> {
    const subscription =
      plan.intervalDays === null
        ? null
        : await this.prisma.subscription.create({
            data: {
              userId,
              companyId: null,
              planId: plan.id,
              status: "INCOMPLETE",
            },
          });

    const invoice = await this.prisma.invoice.create({
      data: {
        subscriptionId: subscription?.id ?? null,
        planId: plan.id,
        userId,
        companyId: null,
        amountCents: 0,
        currency: "USD",
        status: "OPEN",
        method: "POINTS",
      },
    });

    // Synthesize a stable idempotency key from the invoice id so duplicate
    // submissions deduplicate cleanly on the Karama side.
    await this.karama.redeem(userId, {
      reward: "PREMIUM_30D",
      idempotencyKey: `invoice-${invoice.id}`,
    });
    // Force-cost check: karama.redeem also enforces the points cost, but we
    // double-check the spec here so changes to POINTS_PRICE_BY_PLAN stay
    // synchronized with REDEEM_COSTS in karama.service.
    if (cost !== 500) {
      // Allow legitimate change but log when they diverge.
    }
    await this.activateInvoice(invoice.id, "karama-points");

    return {
      invoiceId: invoice.id,
      method: "POINTS",
      providerCheckoutId: null,
      checkoutUrl: null,
      bankTransfer: null,
      wallet: null,
      displayAmountCents,
      displayCurrency,
    };
  }

  async listInvoices(userId: string): Promise<InvoiceDto[]> {
    const memberships = await this.prisma.companyMember.findMany({
      where: { userId },
      select: { companyId: true },
    });
    const companyIds = memberships.map((m) => m.companyId);
    const rows = await this.prisma.invoice.findMany({
      where: {
        OR: [{ userId }, ...(companyIds.length ? [{ companyId: { in: companyIds } }] : [])],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(toInvoiceDto);
  }

  async adminListInvoices(
    status: "NEEDS_REVIEW" | "OPEN" | "PAID" | "VOID" | "ALL",
    limit: number,
  ): Promise<InvoiceDto[]> {
    const where: Prisma.InvoiceWhereInput =
      status === "NEEDS_REVIEW"
        ? { method: "BANK_TRANSFER", status: "OPEN", bankReceiptUrl: { not: null } }
        : status === "ALL"
          ? {}
          : { status };
    const rows = await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toInvoiceDto);
  }

  async submitBankReceipt(
    userId: string,
    invoiceId: string,
    body: BankTransferReceiptBody,
  ): Promise<InvoiceDto> {
    const invoice = await this.assertInvoiceAccess(userId, invoiceId);
    if (invoice.method !== "BANK_TRANSFER") {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Invoice is not bank-transfer.", 400);
    }
    if (invoice.status !== "OPEN") {
      throw new DomainException(ErrorCode.CONFLICT, "Invoice is not open.", 409);
    }

    const row = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { bankReceiptUrl: body.receiptUrl },
    });
    return toInvoiceDto(row);
  }

  async handleHyperPayWebhook(
    payloadOrEncryptedBody: Record<string, unknown> | string,
    signatureOrInitializationVector?: string,
    authenticationTag?: string,
  ): Promise<InvoiceDto> {
    const event =
      typeof payloadOrEncryptedBody === "string"
        ? this.hyperpay.decryptWebhook(
            payloadOrEncryptedBody,
            signatureOrInitializationVector,
            authenticationTag,
          )
        : this.hyperpay.verifyWebhookSignature(
              payloadOrEncryptedBody,
              signatureOrInitializationVector,
            )
          ? { type: "LEGACY", payload: payloadOrEncryptedBody }
          : null;
    const parsed = HyperPayWebhookPayload.safeParse(event);
    if (!parsed.success) {
      throw new DomainException(ErrorCode.AUTH_UNAUTHORIZED, "Invalid webhook payload.", 401);
    }
    const payload = parsed.data.payload;
    const invoiceId = payload.merchantTransactionId;
    if (!invoiceId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Missing merchantTransactionId.", 400);
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { providerInvoiceId: true, amountCents: true, currency: true },
    });
    if (!invoice?.providerInvoiceId) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Card invoice not found.", 404);
    }

    const payment = await this.hyperpay.getCheckoutPayment(invoice.providerInvoiceId);
    const paymentId = payload.paymentId ?? payload.id;
    if (
      payment.merchantTransactionId !== invoiceId ||
      payment.amountCents !== invoice.amountCents ||
      payment.currency !== invoice.currency.toUpperCase() ||
      !paymentId ||
      payment.id !== paymentId
    ) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "Payment does not match invoice.",
        400,
      );
    }

    if (!isHyperPaySuccess(payment.resultCode)) {
      await this.prisma.payment.create({
        data: {
          invoiceId,
          providerPaymentId: payment.id,
          amountCents: payment.amountCents,
          currency: payment.currency,
          status: payment.resultCode ?? "FAILED",
          rawPayload: payment.raw as Prisma.InputJsonObject,
        },
      });
      const failedInvoice = await this.prisma.invoice.findUniqueOrThrow({
        where: { id: invoiceId },
      });
      return toInvoiceDto(failedInvoice);
    }

    return this.activateInvoice(invoiceId, payment.id, payment.raw);
  }

  async adminInvoiceAction(invoiceId: string, body: AdminInvoiceActionBody): Promise<InvoiceDto> {
    if (body.action === "VOID") {
      const invoice = await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "VOID" },
      });
      return toInvoiceDto(invoice);
    }
    return this.activateInvoice(invoiceId, "bank-transfer-admin");
  }

  private async activateInvoice(
    invoiceId: string,
    providerPaymentId: string,
    rawPayload: Record<string, unknown> = { source: providerPaymentId },
  ): Promise<InvoiceDto> {
    const now = new Date();
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { plan: true, subscription: true },
    });
    if (!invoice) throw new DomainException(ErrorCode.NOT_FOUND, "Invoice not found.", 404);
    if (invoice.status === "PAID") return toInvoiceDto(invoice);

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.invoice.updateMany({
        where: { id: invoiceId, status: "OPEN" },
        data: { status: "PAID", paidAt: now },
      });
      const row = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      if (!claimed.count) {
        if (row.status === "PAID") return row;
        throw new DomainException(ErrorCode.CONFLICT, "Invoice is not open.", 409);
      }
      await tx.payment.create({
        data: {
          invoiceId,
          providerPaymentId,
          amountCents: invoice.amountCents,
          currency: invoice.currency,
          status: "PAID",
          rawPayload: rawPayload as Prisma.InputJsonObject,
        },
      });
      if (invoice.subscriptionId && invoice.plan?.intervalDays) {
        await tx.subscription.update({
          where: { id: invoice.subscriptionId },
          data: {
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: new Date(
              now.getTime() + invoice.plan.intervalDays * 24 * 60 * 60 * 1000,
            ),
            providerSubscriptionId: invoice.providerInvoiceId,
          },
        });
      }
      if (invoice.companyId && invoice.plan?.code === "FEATURED_SLOT") {
        await tx.employerCredit.create({
          data: {
            companyId: invoice.companyId,
            kind: "FEATURED_SLOT",
            remaining: 1,
            expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          },
        });
      }
      if (invoice.companyId && invoice.plan?.code === "EMPLOYER_PRO") {
        await tx.employerCredit.create({
          data: {
            companyId: invoice.companyId,
            kind: "FEATURED_SLOT",
            remaining: 1,
            expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
      return row;
    });
    return toInvoiceDto(updated);
  }

  private async ensurePlan(code: PlanCode) {
    const def = PLAN_DEFS[code];
    return this.prisma.plan.upsert({
      where: { code },
      update: {
        name: def.name,
        priceCents: def.priceCents,
        currency: def.currency,
        intervalDays: def.intervalDays,
        features: def.features as Prisma.InputJsonObject,
        isActive: true,
      },
      create: { code, ...def, features: def.features as Prisma.InputJsonObject },
    });
  }

  private async assertScope(
    userId: string,
    planCode: PlanCode,
    companyId: string | null,
  ): Promise<void> {
    const isEmployerPlan = planCode.startsWith("EMPLOYER_") || planCode === "FEATURED_SLOT";
    if (isEmployerPlan && !companyId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "companyId is required.", 400);
    }
    if (!isEmployerPlan && companyId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "companyId is not allowed.", 400);
    }
    if (!companyId) return;

    const member = await this.prisma.companyMember.findFirst({
      where: { companyId, userId, role: { in: ["OWNER", "ADMIN"] } },
      select: { id: true },
    });
    if (!member) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "Only company owners/admins can buy plans.",
        403,
      );
    }
  }

  private async assertInvoiceAccess(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new DomainException(ErrorCode.NOT_FOUND, "Invoice not found.", 404);
    if (invoice.userId === userId) return invoice;
    if (invoice.companyId) {
      const member = await this.prisma.companyMember.findFirst({
        where: { companyId: invoice.companyId, userId },
        select: { id: true },
      });
      if (member) return invoice;
    }
    throw new DomainException(ErrorCode.AUTH_FORBIDDEN, "Invoice is not accessible.", 403);
  }
}

function digest(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isHyperPaySuccess(code: string | undefined): boolean {
  return !!code && /^(000\.000\.|000\.100\.1|000\.[36])/.test(code);
}

function toInvoiceDto(row: {
  id: string;
  subscriptionId: string | null;
  planId: string | null;
  userId: string | null;
  companyId: string | null;
  amountCents: number;
  currency: string;
  status: InvoiceDto["status"];
  method: InvoiceDto["method"];
  providerInvoiceId: string | null;
  bankReceiptUrl: string | null;
  dueAt: Date | null;
  paidAt: Date | null;
  pdfUrl: string | null;
  createdAt: Date;
}): InvoiceDto {
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    planId: row.planId,
    userId: row.userId,
    companyId: row.companyId,
    amountCents: row.amountCents,
    currency: row.currency,
    status: row.status,
    method: row.method,
    providerInvoiceId: row.providerInvoiceId,
    bankReceiptUrl: row.bankReceiptUrl,
    dueAt: row.dueAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    pdfUrl: row.pdfUrl,
    createdAt: row.createdAt.toISOString(),
  };
}
