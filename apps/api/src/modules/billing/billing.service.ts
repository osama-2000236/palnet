import { Prisma } from "@baydar/db";
import {
  type AdminInvoiceActionBody,
  type BankTransferReceiptBody,
  type CheckoutSession,
  type CheckoutSessionBody,
  type Invoice as InvoiceDto,
  ErrorCode,
  type PlanCode,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { PrismaService } from "../prisma/prisma.service";

import { HyperPayClient } from "./hyperpay.client";
import { PLAN_DEFS } from "./pricing";

type HyperPayWebhookPayload = {
  merchantTransactionId?: string;
  id?: string;
  paymentId?: string;
  result?: { code?: string; description?: string };
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hyperpay: HyperPayClient,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async createCheckoutSession(userId: string, body: CheckoutSessionBody): Promise<CheckoutSession> {
    const plan = await this.ensurePlan(body.planCode);
    await this.assertScope(userId, body.planCode, body.companyId ?? null);

    if (body.method === "POINTS") {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "Use Karama redemption for points.",
        400,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);

    const subscription =
      plan.intervalDays === null
        ? null
        : await this.prisma.subscription.create({
            data: {
              userId: body.companyId ? null : userId,
              companyId: body.companyId ?? null,
              planId: plan.id,
              status: "INCOMPLETE",
            },
          });

    const invoice = await this.prisma.invoice.create({
      data: {
        subscriptionId: subscription?.id ?? null,
        planId: plan.id,
        userId: body.companyId ? null : userId,
        companyId: body.companyId ?? null,
        amountCents: plan.priceCents,
        currency: plan.currency,
        status: plan.priceCents === 0 ? "PAID" : "OPEN",
        method: body.method,
        paidAt: plan.priceCents === 0 ? new Date() : null,
        dueAt:
          body.method === "BANK_TRANSFER" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
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
      };
    }

    const checkout = await this.hyperpay.createCheckout({
      invoiceId: invoice.id,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      returnUrl: body.returnUrl,
      customerEmail: user.email,
    });
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { providerInvoiceId: checkout.providerCheckoutId },
    });

    return {
      invoiceId: invoice.id,
      method: "CARD",
      providerCheckoutId: checkout.providerCheckoutId,
      checkoutUrl: checkout.checkoutUrl,
      bankTransfer: null,
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
    payload: HyperPayWebhookPayload,
    signature?: string,
  ): Promise<InvoiceDto> {
    if (!this.hyperpay.verifyWebhookSignature(payload, signature)) {
      throw new DomainException(ErrorCode.AUTH_UNAUTHORIZED, "Invalid webhook signature.", 401);
    }
    const invoiceId = payload.merchantTransactionId;
    if (!invoiceId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Missing merchantTransactionId.", 400);
    }

    const paid = isHyperPaySuccess(payload.result?.code);
    if (!paid) {
      await this.prisma.payment.create({
        data: {
          invoiceId,
          providerPaymentId: payload.paymentId ?? payload.id ?? null,
          amountCents: 0,
          status: payload.result?.code ?? "FAILED",
          rawPayload: payload as Prisma.InputJsonObject,
        },
      });
      const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      return toInvoiceDto(invoice);
    }

    return this.activateInvoice(invoiceId, payload.paymentId ?? payload.id ?? "hyperpay");
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

  private async activateInvoice(invoiceId: string, providerPaymentId: string): Promise<InvoiceDto> {
    const now = new Date();
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { plan: true, subscription: true },
    });
    if (!invoice) throw new DomainException(ErrorCode.NOT_FOUND, "Invoice not found.", 404);
    if (invoice.status === "PAID") return toInvoiceDto(invoice);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID", paidAt: now },
      });
      await tx.payment.create({
        data: {
          invoiceId,
          providerPaymentId,
          amountCents: invoice.amountCents,
          currency: invoice.currency,
          status: "PAID",
          rawPayload: { source: providerPaymentId },
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
