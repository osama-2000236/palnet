import { Prisma } from "@baydar/db";
import {
  type AdminInvoice as AdminInvoiceDto,
  type AdminInvoiceActionBody,
  type BankTransferReceiptBody,
  type BillingCatalog,
  type BillingMe,
  type CheckoutSession,
  type CheckoutSessionBody,
  type CompanyBillingSummary,
  type Invoice as InvoiceDto,
  type Subscription as SubscriptionDto,
  ErrorCode,
  type PaymentMethod,
  PLAN_DEFS,
  type PlanCode,
  type WalletProvider,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { KaramaService } from "../karama/karama.service";
import { PrismaService } from "../prisma/prisma.service";

import { deriveDisplayCurrency } from "./currency";
import { EmployerEntitlementsService } from "./employer-entitlements.service";
import { FxService } from "./fx.service";
import { HyperPayClient } from "./hyperpay.client";
import { ALL_PLAN_CODES, POINTS_PRICE_BY_PLAN } from "./pricing";
import { WalletRegistry } from "./wallets/wallet-registry";

const WALLET_METHODS = new Set<PaymentMethod>(["JAWWALPAY", "PALPAY", "REFLECT"]);

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
    private readonly karama: KaramaService,
    private readonly wallets: WalletRegistry,
    private readonly entitlements: EmployerEntitlementsService,
    private readonly fx: FxService,
  ) {}

  async createCheckoutSession(userId: string, body: CheckoutSessionBody): Promise<CheckoutSession> {
    const plan = await this.ensurePlan(body.planCode);
    await this.assertScope(userId, body.planCode, body.companyId ?? null);
    assertSafeReturnUrl(body.returnUrl, this.config);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, locale: true },
    });
    if (!user) throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);

    const displayCurrency = deriveDisplayCurrency(user.locale);
    const displayAmountCents = this.fx.convertCents(
      plan.priceCents,
      plan.currency,
      displayCurrency,
    );

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
      return this.processPointsCheckout(userId, plan, displayAmountCents, displayCurrency);
    }

    // Guard before creating any subscription/invoice: an unconfigured rail
    // must fail honestly, never mint an invoice pointing at a placeholder IBAN.
    const bankDestination = this.bankTransferDestination();
    if (body.method === "BANK_TRANSFER" && bankDestination === null) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "Bank transfer is not available yet.",
        400,
      );
    }

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
        // Free plans are activated below (status + paidAt set together inside activateInvoice).
        status: "OPEN",
        method: body.method,
        dueAt:
          body.method === "BANK_TRANSFER" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
    });

    if (plan.priceCents === 0) {
      await this.activateInvoice(invoice.id, "free-plan");
    }

    if (body.method === "BANK_TRANSFER" && bankDestination !== null) {
      return {
        invoiceId: invoice.id,
        method: "BANK_TRANSFER",
        providerCheckoutId: null,
        checkoutUrl: null,
        bankTransfer: {
          beneficiary: bankDestination.beneficiary,
          iban: bankDestination.iban,
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
    plan: { id: string; intervalDays: number | null },
    displayAmountCents: number,
    displayCurrency: string,
  ): Promise<CheckoutSession> {
    // One live term per plan. `activateInvoice` sets currentPeriodEnd to
    // now + intervalDays, so a second purchase shortens the term it was meant
    // to extend — the buyer pays twice and ends up with less time.
    const live = await this.prisma.subscription.findFirst({
      where: { userId, planId: plan.id, status: { in: ["TRIALING", "ACTIVE"] } },
      select: { id: true },
    });
    if (live) {
      throw new DomainException(ErrorCode.CONFLICT, "This plan is already active.", 409);
    }

    // Debit before creating anything. Two reasons:
    //   1. A rejected redemption (insufficient balance) used to leave an OPEN
    //      invoice and an INCOMPLETE subscription visible on /me/premium.
    //   2. The key must be stable across retries. It used to be
    //      `invoice-${invoice.id}` for an invoice this same call had just
    //      created, so it was unique on every attempt and deduplicated
    //      nothing — a double-submit or a retry after a client timeout
    //      debited 500 points twice. Scoping to the UTC day dedupes those
    //      while still allowing renewal once the 30-day term lapses.
    // ponytail: day-scoped key + the guard above. Two things this leans on,
    // both verified, both worth re-checking if they change:
    //   - Nothing in this codebase transitions a subscription out of ACTIVE
    //     (only `cancelAtPeriodEnd`, which leaves status alone). If something
    //     ever does, a same-day cancel-and-rebuy would replay the ledger row
    //     and hand out a second term without debiting. Narrow the bucket then.
    //   - Two genuinely simultaneous requests still each get a subscription
    //     row, though only one debit — the ledger unique sees to that.
    // Upgrade path for both: a partial unique index on Subscription
    // (userId, planId) WHERE status IN ('TRIALING','ACTIVE','INCOMPLETE').
    await this.karama.redeem(userId, {
      reward: "PREMIUM_30D",
      idempotencyKey: `premium-30d:${userId}:${new Date().toISOString().slice(0, 10)}`,
    });

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

  // Catalog of plans priced for the viewer (display currency derived from
  // their locale) plus which local wallets are actually configured, so the
  // UI can render unconfigured providers as "coming soon" without creating
  // dead invoices.
  async getCatalog(userId: string): Promise<BillingCatalog> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true },
    });
    if (!user) throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);

    const displayCurrency = deriveDisplayCurrency(user.locale);
    const plans = await Promise.all(ALL_PLAN_CODES.map((code) => this.ensurePlan(code)));
    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        priceCents: plan.priceCents,
        currency: plan.currency,
        intervalDays: plan.intervalDays,
        features: (plan.features ?? {}) as Record<string, unknown>,
        isActive: plan.isActive,
        displayAmountCents: this.fx.convertCents(plan.priceCents, plan.currency, displayCurrency),
        displayCurrency,
        pointsPrice: POINTS_PRICE_BY_PLAN[plan.code] ?? null,
      })),
      wallets: this.wallets.availability(),
      bankTransfer: this.bankTransferDestination(),
    };
  }

  // Null until BANK_TRANSFER_IBAN is configured — the catalog contract tells
  // clients to withhold the bank-transfer method rather than render a
  // placeholder IBAN to a paying user.
  private bankTransferDestination(): { beneficiary: string; iban: string } | null {
    const iban = this.config.get("BANK_TRANSFER_IBAN", { infer: true });
    if (!iban) return null;
    return {
      beneficiary: this.config.get("BANK_TRANSFER_BENEFICIARY", { infer: true }) ?? "Baydar",
      iban,
    };
  }

  // The viewer's personal subscription (latest non-canceled one, if any).
  // Company subscriptions are intentionally excluded — they belong to the
  // employer billing surface and are scoped by company membership there.
  async getBillingMe(userId: string): Promise<BillingMe> {
    const row = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });
    return { subscription: row ? toSubscriptionDto(row) : null };
  }

  // Stop the renewal at the end of the paid period. Not an immediate refund
  // and not a status change: the member keeps what they paid for until
  // `currentPeriodEnd`, which is what `/me/premium` already promises.
  async cancelAtPeriodEnd(userId: string): Promise<BillingMe> {
    const row = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "No active subscription.", 404);
    }
    if (!row.cancelAtPeriodEnd) {
      await this.prisma.subscription.update({
        where: { id: row.id },
        data: { cancelAtPeriodEnd: true },
      });
    }
    return this.getBillingMe(userId);
  }

  // Billing state for one company. Access (owner/admin membership) is
  // enforced by CompanyRoleGuard on the controller route.
  async getCompanyBillingSummary(companyId: string): Promise<CompanyBillingSummary> {
    const now = new Date();
    const [subscription, activeJobs, jobLimit, credits] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { companyId, status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
        orderBy: { createdAt: "desc" },
        include: { plan: true },
      }),
      this.prisma.job.count({ where: { companyId, isActive: true, deletedAt: null } }),
      this.entitlements.activeJobLimit(companyId),
      this.prisma.employerCredit.findMany({
        where: {
          companyId,
          remaining: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { expiresAt: "asc" },
        select: { kind: true, remaining: true, expiresAt: true },
      }),
    ]);

    return {
      subscription: subscription ? toSubscriptionDto(subscription) : null,
      activeJobs,
      jobLimit,
      credits: credits.map((credit) => ({
        kind: credit.kind,
        remaining: credit.remaining,
        expiresAt: credit.expiresAt?.toISOString() ?? null,
      })),
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
  ): Promise<AdminInvoiceDto[]> {
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
      // Payer identity for the operator review queue — names, not cuids.
      include: {
        user: {
          select: { email: true, profile: { select: { firstName: true, lastName: true } } },
        },
        company: { select: { name: true } },
      },
    });
    return rows.map(({ user, company, ...row }) => ({
      ...toInvoiceDto(row),
      userEmail: user?.email ?? null,
      userName: user?.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : null,
      companyName: company?.name ?? null,
    }));
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

  async adminInvoiceAction(
    invoiceId: string,
    actorId: string,
    body: AdminInvoiceActionBody,
  ): Promise<InvoiceDto> {
    if (body.action === "VOID") {
      const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new DomainException(ErrorCode.NOT_FOUND, "Invoice not found.", 404);
      // Idempotent: a second VOID keeps the original reviewer's audit trail.
      if (invoice.status === "VOID") return toInvoiceDto(invoice);
      if (invoice.status === "PAID") {
        throw new DomainException(
          ErrorCode.CONFLICT,
          "Invoice is already paid; it cannot be voided from the review queue.",
          409,
        );
      }
      // Conditional write: only void an invoice that is still in a voidable
      // state, so a concurrent reviewer or payment cannot be overwritten.
      const voided = await this.prisma.invoice.updateMany({
        where: { id: invoiceId, status: { notIn: ["PAID", "VOID"] } },
        data: {
          status: "VOID",
          reviewedById: actorId,
          reviewedAt: new Date(),
          reviewNote: body.note ?? null,
        },
      });
      if (voided.count === 0) {
        throw new DomainException(
          ErrorCode.CONFLICT,
          "Invoice was updated concurrently; refresh the review queue.",
          409,
        );
      }
      const row = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
      return toInvoiceDto(row);
    }
    return this.activateInvoice(invoiceId, "bank-transfer-admin", {
      reviewedById: actorId,
      reviewNote: body.note ?? null,
    });
  }

  private async activateInvoice(
    invoiceId: string,
    providerPaymentId: string,
    review?: { reviewedById: string; reviewNote: string | null },
  ): Promise<InvoiceDto> {
    const now = new Date();
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { plan: true, subscription: true },
    });
    if (!invoice) throw new DomainException(ErrorCode.NOT_FOUND, "Invoice not found.", 404);
    if (invoice.status === "PAID") return toInvoiceDto(invoice);
    if (invoice.status === "VOID") {
      throw new DomainException(
        ErrorCode.CONFLICT,
        "Invoice is void; reopen it before marking it paid.",
        409,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Conditional claim: exactly one caller (admin action or webhook) may
      // transition the invoice to PAID; a concurrent second caller gets a
      // conflict instead of creating a duplicate payment row.
      const claimed = await tx.invoice.updateMany({
        where: { id: invoiceId, status: { notIn: ["PAID", "VOID"] } },
        data: {
          status: "PAID",
          paidAt: now,
          ...(review
            ? { reviewedById: review.reviewedById, reviewedAt: now, reviewNote: review.reviewNote }
            : {}),
        },
      });
      if (claimed.count === 0) {
        throw new DomainException(
          ErrorCode.CONFLICT,
          "Invoice was updated concurrently; refresh and retry.",
          409,
        );
      }
      const row = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
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

/** First-party origins only (BAYDAR_WEB_URL + CORS_ORIGINS). */
function assertSafeReturnUrl(returnUrl: string, config: ConfigService<Env, true>): void {
  let u: URL;
  try {
    u = new URL(returnUrl);
  } catch {
    throw new DomainException(ErrorCode.VALIDATION_FAILED, "Invalid returnUrl.", 400);
  }
  // http is a local-dev affordance only — a payment return URL must not
  // downgrade in production even if CORS_ORIGINS carries an http entry.
  const allowHttp = process.env.NODE_ENV !== "production";
  if (u.protocol !== "https:" && !(allowHttp && u.protocol === "http:")) {
    throw new DomainException(ErrorCode.VALIDATION_FAILED, "Invalid returnUrl.", 400);
  }
  if (u.username || u.password) {
    throw new DomainException(ErrorCode.VALIDATION_FAILED, "Invalid returnUrl.", 400);
  }
  const allowed = new Set<string>();
  const seeds = [
    config.get("BAYDAR_WEB_URL", { infer: true }),
    ...(config.get("CORS_ORIGINS", { infer: true })?.split(",") ?? []),
  ];
  for (const raw of seeds) {
    const t = raw?.trim();
    if (!t || t.includes("*")) continue;
    try {
      const o = new URL(t);
      allowed.add(`${o.protocol}//${o.host}`);
    } catch {
      // skip bad env entry
    }
  }
  if (!allowed.has(`${u.protocol}//${u.host}`)) {
    throw new DomainException(ErrorCode.VALIDATION_FAILED, "returnUrl origin not allowed.", 400);
  }
}

function isHyperPaySuccess(code: string | undefined): boolean {
  return !!code && /^(000\.000\.|000\.100\.1|000\.[36])/.test(code);
}

function toSubscriptionDto(row: {
  id: string;
  userId: string | null;
  companyId: string | null;
  planId: string;
  status: SubscriptionDto["status"];
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  providerSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  plan?: {
    id: string;
    code: PlanCode;
    name: string;
    priceCents: number;
    currency: string;
    intervalDays: number | null;
    features: unknown;
    isActive: boolean;
  };
}): SubscriptionDto {
  return {
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    planId: row.planId,
    status: row.status,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    providerSubscriptionId: row.providerSubscriptionId,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    plan: row.plan
      ? {
          id: row.plan.id,
          code: row.plan.code,
          name: row.plan.name,
          priceCents: row.plan.priceCents,
          currency: row.plan.currency,
          intervalDays: row.plan.intervalDays,
          features: (row.plan.features ?? {}) as Record<string, unknown>,
          isActive: row.plan.isActive,
        }
      : undefined,
  };
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
  reviewedAt: Date | null;
  reviewNote: string | null;
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
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt.toISOString(),
  };
}
