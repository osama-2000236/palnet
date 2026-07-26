import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { KaramaService } from "../karama/karama.service";
import { PrismaService } from "../prisma/prisma.service";

import { BillingService } from "./billing.service";
import { EmployerEntitlementsService } from "./employer-entitlements.service";
import { FxService } from "./fx.service";
import { HyperPayClient } from "./hyperpay.client";
import { WalletRegistry } from "./wallets/wallet-registry";

type PrismaStub = {
  plan: { upsert: jest.Mock };
  user: { findUnique: jest.Mock };
  companyMember: { findFirst: jest.Mock; findMany: jest.Mock };
  subscription: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
  job: { count: jest.Mock };
  employerCredit: { findMany: jest.Mock };
  invoice: {
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
  payment: { create: jest.Mock };
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaStub {
  return {
    plan: { upsert: jest.fn() },
    user: { findUnique: jest.fn() },
    companyMember: { findFirst: jest.fn(), findMany: jest.fn() },
    subscription: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    job: { count: jest.fn() },
    employerCredit: { findMany: jest.fn() },
    invoice: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    payment: { create: jest.fn() },
    $transaction: jest.fn(async (fn) => fn({} as never)),
  };
}

describe("BillingService", () => {
  let service: BillingService;
  let prisma: PrismaStub;
  let hyperpay: { createCheckout: jest.Mock; verifyWebhookSignature: jest.Mock };
  let karama: { redeem: jest.Mock; award: jest.Mock; awardOnce: jest.Mock };
  let tx: {
    invoice: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
    payment: { create: jest.Mock };
    subscription: { update: jest.Mock };
    employerCredit: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = buildPrisma();
    hyperpay = {
      createCheckout: jest.fn(),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };
    karama = {
      redeem: jest.fn().mockResolvedValue({
        balance: 0,
        reward: "PREMIUM_30D",
        appliedAt: new Date("2026-07-25T00:00:00Z").toISOString(),
      }),
      award: jest.fn(),
      awardOnce: jest.fn(),
    };
    tx = {
      invoice: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn(),
      },
      payment: { create: jest.fn() },
      subscription: { update: jest.fn() },
      employerCredit: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(tx as never));
    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        FxService,
        { provide: PrismaService, useValue: prisma },
        { provide: HyperPayClient, useValue: hyperpay },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string) =>
                ({
                  BANK_TRANSFER_IBAN: "PS00TEST",
                  BANK_TRANSFER_BENEFICIARY: "Baydar",
                  BAYDAR_WEB_URL: "https://baydar.ps",
                  CORS_ORIGINS: "https://baydar.ps,http://localhost:3000",
                })[key],
            ),
          },
        },
        { provide: KaramaService, useValue: karama },
        {
          provide: EmployerEntitlementsService,
          useValue: { activeJobLimit: jest.fn().mockResolvedValue(5) },
        },
        {
          provide: WalletRegistry,
          useValue: {
            get: jest.fn(() => ({
              provider: "JAWWALPAY",
              isConfigured: () => false,
              createCheckout: jest.fn().mockResolvedValue({
                provider: "JAWWALPAY",
                instructions: "Coming soon",
              }),
            })),
            availability: jest.fn(() => [
              { provider: "JAWWALPAY", configured: false },
              { provider: "PALPAY", configured: false },
              { provider: "REFLECT", configured: false },
            ]),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(BillingService);
  });

  it("creates a bank-transfer invoice with instructions", async () => {
    prisma.plan.upsert.mockResolvedValue({
      id: "plan-1",
      code: "EMPLOYER_BASIC",
      priceCents: 2900,
      currency: "USD",
      intervalDays: 30,
    });
    prisma.companyMember.findFirst.mockResolvedValue({ id: "member-1" });
    prisma.user.findUnique.mockResolvedValue({ email: "owner@baydar.ps" });
    prisma.subscription.create.mockResolvedValue({ id: "sub-1" });
    prisma.invoice.create.mockResolvedValue({
      id: "inv-1",
      subscriptionId: "sub-1",
      planId: "plan-1",
      userId: null,
      companyId: "company-1",
      amountCents: 2900,
      currency: "USD",
      status: "OPEN",
      method: "BANK_TRANSFER",
      providerInvoiceId: null,
      bankReceiptUrl: null,
      dueAt: new Date("2026-05-22T00:00:00Z"),
      paidAt: null,
      pdfUrl: null,
      createdAt: new Date("2026-05-15T00:00:00Z"),
    });

    const result = await service.createCheckoutSession("user-1", {
      planCode: "EMPLOYER_BASIC",
      companyId: "company-1",
      returnUrl: "https://baydar.ps/billing/return",
      method: "BANK_TRANSFER",
    });

    expect(result).toMatchObject({
      invoiceId: "inv-1",
      method: "BANK_TRANSFER",
      bankTransfer: { iban: "PS00TEST", beneficiary: "Baydar", reference: "inv-1" },
    });
    expect(hyperpay.createCheckout).not.toHaveBeenCalled();
  });

  it("activates subscription idempotently from a paid HyperPay webhook", async () => {
    const invoice = {
      id: "inv-1",
      subscriptionId: "sub-1",
      planId: "plan-1",
      userId: null,
      companyId: "company-1",
      amountCents: 9900,
      currency: "USD",
      status: "OPEN",
      method: "CARD",
      providerInvoiceId: "checkout-1",
      bankReceiptUrl: null,
      dueAt: null,
      paidAt: null,
      pdfUrl: null,
      createdAt: new Date("2026-05-15T00:00:00Z"),
      plan: { code: "EMPLOYER_PRO", intervalDays: 30 },
      subscription: { id: "sub-1" },
    };
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    tx.invoice.findUniqueOrThrow.mockResolvedValue({
      ...invoice,
      status: "PAID",
      paidAt: new Date("2026-05-15T00:00:00Z"),
    });

    const result = await service.handleHyperPayWebhook({
      merchantTransactionId: "inv-1",
      paymentId: "pay-1",
      result: { code: "000.000.000" },
    });

    expect(result.status).toBe("PAID");
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({ status: "ACTIVE" }),
    });
    expect(tx.employerCredit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "company-1",
        kind: "FEATURED_SLOT",
        remaining: 1,
      }),
    });

    prisma.invoice.findUnique.mockResolvedValue({ ...invoice, status: "PAID" });
    await service.handleHyperPayWebhook({
      merchantTransactionId: "inv-1",
      paymentId: "pay-1",
      result: { code: "000.000.000" },
    });
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
  });

  it("admin mark-paid activates a bank-transfer invoice", async () => {
    const invoice = {
      id: "inv-2",
      subscriptionId: "sub-2",
      planId: "plan-2",
      userId: null,
      companyId: "company-1",
      amountCents: 2900,
      currency: "USD",
      status: "OPEN",
      method: "BANK_TRANSFER",
      providerInvoiceId: null,
      bankReceiptUrl: "https://media.baydar.ps/receipt.jpg",
      dueAt: null,
      paidAt: null,
      pdfUrl: null,
      createdAt: new Date("2026-05-15T00:00:00Z"),
      plan: { code: "EMPLOYER_BASIC", intervalDays: 30 },
      subscription: { id: "sub-2" },
    };
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    tx.invoice.findUniqueOrThrow.mockResolvedValue({
      ...invoice,
      status: "PAID",
      paidAt: new Date("2026-05-15T00:00:00Z"),
    });

    const result = await service.adminInvoiceAction("inv-2", "admin-1", { action: "MARK_PAID" });

    expect(result.status).toBe("PAID");
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-2" },
      data: expect.objectContaining({ status: "ACTIVE" }),
    });
    // Operator approval leaves an audit trail on the invoice itself, and the
    // PAID transition is a conditional claim so it can only happen once.
    expect(tx.invoice.updateMany).toHaveBeenCalledWith({
      where: { id: "inv-2", status: { notIn: ["PAID", "VOID"] } },
      data: expect.objectContaining({
        status: "PAID",
        reviewedById: "admin-1",
        reviewedAt: expect.any(Date),
      }),
    });
  });

  it("409s when a concurrent caller pays the invoice mid-transaction", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-7",
      status: "OPEN",
      amountCents: 2900,
      currency: "USD",
      subscriptionId: null,
      plan: null,
      subscription: null,
    });
    tx.invoice.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.adminInvoiceAction("inv-7", "admin-1", { action: "MARK_PAID" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it("admin mark-paid 404s on a missing invoice and 409s on a void one", async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);
    await expect(
      service.adminInvoiceAction("inv-missing", "admin-1", { action: "MARK_PAID" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-4",
      status: "VOID",
      plan: null,
      subscription: null,
    });
    await expect(
      service.adminInvoiceAction("inv-4", "admin-1", { action: "MARK_PAID" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("admin void records reviewer, reason, and timestamp", async () => {
    const invoice = {
      id: "inv-5",
      subscriptionId: null,
      planId: "plan-5",
      userId: "user-1",
      companyId: null,
      amountCents: 500,
      currency: "USD",
      status: "OPEN",
      method: "BANK_TRANSFER",
      providerInvoiceId: null,
      bankReceiptUrl: "https://media.baydar.ps/receipt.jpg",
      dueAt: null,
      paidAt: null,
      pdfUrl: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date("2026-07-01T00:00:00Z"),
    };
    prisma.invoice.findUnique.mockResolvedValue(invoice);
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      ...invoice,
      status: "VOID",
      reviewedAt: new Date("2026-07-02T00:00:00Z"),
      reviewNote: "receipt unreadable",
    });

    const result = await service.adminInvoiceAction("inv-5", "admin-1", {
      action: "VOID",
      note: "receipt unreadable",
    });

    expect(result.status).toBe("VOID");
    expect(result.reviewNote).toBe("receipt unreadable");
    expect(prisma.invoice.updateMany).toHaveBeenCalledWith({
      where: { id: "inv-5", status: { notIn: ["PAID", "VOID"] } },
      data: expect.objectContaining({
        status: "VOID",
        reviewedById: "admin-1",
        reviewNote: "receipt unreadable",
        reviewedAt: expect.any(Date),
      }),
    });
  });

  it("409s when a void loses a race with a concurrent payment", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-8",
      status: "OPEN",
      subscriptionId: null,
      planId: null,
      userId: "user-1",
      companyId: null,
      amountCents: 500,
      currency: "USD",
      method: "BANK_TRANSFER",
      providerInvoiceId: null,
      bankReceiptUrl: null,
      dueAt: null,
      paidAt: null,
      pdfUrl: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date("2026-07-01T00:00:00Z"),
    });
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.adminInvoiceAction("inv-8", "admin-1", { action: "VOID" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("admin void is idempotent and refuses to void a paid invoice", async () => {
    const base = {
      id: "inv-6",
      subscriptionId: null,
      planId: "plan-6",
      userId: "user-1",
      companyId: null,
      amountCents: 500,
      currency: "USD",
      method: "BANK_TRANSFER",
      providerInvoiceId: null,
      bankReceiptUrl: null,
      dueAt: null,
      paidAt: null,
      pdfUrl: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date("2026-07-01T00:00:00Z"),
    };
    prisma.invoice.findUnique.mockResolvedValue({ ...base, status: "VOID" });
    const result = await service.adminInvoiceAction("inv-6", "admin-2", { action: "VOID" });
    expect(result.status).toBe("VOID");
    expect(prisma.invoice.updateMany).not.toHaveBeenCalled();

    prisma.invoice.findUnique.mockResolvedValue({
      ...base,
      status: "PAID",
      paidAt: new Date("2026-07-01T12:00:00Z"),
    });
    await expect(
      service.adminInvoiceAction("inv-6", "admin-2", { action: "VOID" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    prisma.invoice.findUnique.mockResolvedValue(null);
    await expect(
      service.adminInvoiceAction("inv-missing", "admin-2", { action: "VOID" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects HyperPay webhook with an invalid signature", async () => {
    hyperpay.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleHyperPayWebhook(
        { merchantTransactionId: "inv-1", result: { code: "000.000.000" } },
        "bogus-signature",
      ),
    ).rejects.toMatchObject({ code: "AUTH_UNAUTHORIZED" });
    expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects checkout returnUrl pointing at a third-party origin", async () => {
    prisma.plan.upsert.mockResolvedValue({
      id: "plan-1",
      code: "USER_PREMIUM",
      priceCents: 500,
      currency: "USD",
      intervalDays: 30,
    });
    prisma.user.findUnique.mockResolvedValue({ email: "user@baydar.ps", locale: "ar-PS" });

    await expect(
      service.createCheckoutSession("user-1", {
        planCode: "USER_PREMIUM",
        returnUrl: "https://evil.example/phish",
        method: "CARD",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(prisma.invoice.create).not.toHaveBeenCalled();
    expect(hyperpay.createCheckout).not.toHaveBeenCalled();
  });

  it("rejects checkout returnUrl with embedded credentials", async () => {
    prisma.plan.upsert.mockResolvedValue({
      id: "plan-1",
      code: "USER_PREMIUM",
      priceCents: 500,
      currency: "USD",
      intervalDays: 30,
    });

    await expect(
      service.createCheckoutSession("user-1", {
        planCode: "USER_PREMIUM",
        returnUrl: "https://attacker@baydar.ps/billing/return",
        method: "CARD",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(hyperpay.createCheckout).not.toHaveBeenCalled();
  });

  // The POINTS rail had no coverage at all, and it was the rail with the
  // money bug: the redemption key was derived from an invoice the same call
  // had just created, so it was unique on every attempt and deduplicated
  // nothing.
  describe("Karama points checkout", () => {
    function arrangePremiumPlan(): void {
      prisma.plan.upsert.mockResolvedValue({
        id: "plan-premium",
        code: "USER_PREMIUM",
        priceCents: 500,
        currency: "USD",
        intervalDays: 30,
      });
      prisma.user.findUnique.mockResolvedValue({ email: "user@baydar.ps", locale: "ar-PS" });
      prisma.subscription.create.mockResolvedValue({ id: "sub-points" });
      prisma.invoice.create.mockResolvedValue({
        id: "inv-points",
        subscriptionId: "sub-points",
        planId: "plan-premium",
        userId: "user-1",
        companyId: null,
        amountCents: 0,
        currency: "USD",
        status: "OPEN",
        method: "POINTS",
        providerInvoiceId: null,
        bankReceiptUrl: null,
        dueAt: null,
        paidAt: null,
        pdfUrl: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date("2026-07-25T00:00:00Z"),
        plan: { code: "USER_PREMIUM", intervalDays: 30 },
        subscription: { id: "sub-points" },
      });
    }

    it("redeems with a key that is stable across retries", async () => {
      arrangePremiumPlan();
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.invoice.findUnique.mockResolvedValue({
        id: "inv-points",
        status: "OPEN",
        amountCents: 0,
        currency: "USD",
        subscriptionId: null,
        plan: null,
        subscription: null,
      });
      tx.invoice.findUniqueOrThrow.mockResolvedValue({
        id: "inv-points",
        subscriptionId: null,
        planId: "plan-premium",
        userId: "user-1",
        companyId: null,
        amountCents: 0,
        currency: "USD",
        status: "PAID",
        method: "POINTS",
        providerInvoiceId: null,
        bankReceiptUrl: null,
        dueAt: null,
        paidAt: new Date("2026-07-25T00:00:00Z"),
        pdfUrl: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: new Date("2026-07-25T00:00:00Z"),
      });

      const body = {
        planCode: "USER_PREMIUM" as const,
        returnUrl: "https://baydar.ps/billing/return",
        method: "POINTS" as const,
      };
      await service.createCheckoutSession("user-1", body);
      await service.createCheckoutSession("user-1", body);

      const keys = karama.redeem.mock.calls.map((call) => call[1].idempotencyKey);
      expect(keys).toHaveLength(2);
      // Same purchase intent, same key — that is what lets `karama.redeem`
      // replay instead of debiting a second 500 points.
      expect(keys[0]).toBe(keys[1]);
      expect(keys[0]).toMatch(/^premium-30d:user-1:\d{4}-\d{2}-\d{2}$/);
    });

    it("debits before creating rows, so a rejected redemption leaves no invoice", async () => {
      arrangePremiumPlan();
      prisma.subscription.findFirst.mockResolvedValue(null);
      karama.redeem.mockRejectedValueOnce(new Error("Insufficient Karama balance."));

      await expect(
        service.createCheckoutSession("user-1", {
          planCode: "USER_PREMIUM",
          returnUrl: "https://baydar.ps/billing/return",
          method: "POINTS",
        }),
      ).rejects.toThrow("Insufficient Karama balance.");

      expect(prisma.invoice.create).not.toHaveBeenCalled();
      expect(prisma.subscription.create).not.toHaveBeenCalled();
    });

    it("409s rather than shortening a term the member already paid for", async () => {
      arrangePremiumPlan();
      prisma.subscription.findFirst.mockResolvedValue({ id: "sub-live" });

      await expect(
        service.createCheckoutSession("user-1", {
          planCode: "USER_PREMIUM",
          returnUrl: "https://baydar.ps/billing/return",
          method: "POINTS",
        }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(karama.redeem).not.toHaveBeenCalled();
    });

    it("refuses points for a plan that is not redeemable", async () => {
      prisma.plan.upsert.mockResolvedValue({
        id: "plan-pro",
        code: "EMPLOYER_PRO",
        priceCents: 9900,
        currency: "USD",
        intervalDays: 30,
      });
      prisma.companyMember.findFirst.mockResolvedValue({ id: "member-1" });
      prisma.user.findUnique.mockResolvedValue({ email: "owner@baydar.ps", locale: "ar-PS" });

      await expect(
        service.createCheckoutSession("user-1", {
          planCode: "EMPLOYER_PRO",
          companyId: "company-1",
          returnUrl: "https://baydar.ps/billing/return",
          method: "POINTS",
        }),
      ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
      expect(karama.redeem).not.toHaveBeenCalled();
    });
  });

  it("prices the catalog in the viewer's display currency with points prices", async () => {
    prisma.user.findUnique.mockResolvedValue({ locale: "ar-PS" });
    prisma.plan.upsert.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({
        id: `plan-${where.code}`,
        code: where.code,
        name: where.code,
        priceCents: where.code === "USER_PREMIUM" ? 500 : 2900,
        currency: "USD",
        intervalDays: 30,
        features: {},
        isActive: true,
      }),
    );

    const catalog = await service.getCatalog("user-1");

    const premium = catalog.plans.find((plan) => plan.code === "USER_PREMIUM");
    expect(premium).toMatchObject({
      displayCurrency: "ILS",
      displayAmountCents: 1800, // 500 USD cents * 3.6 ILS/USD
      pointsPrice: 500,
    });
    const employer = catalog.plans.find((plan) => plan.code === "EMPLOYER_BASIC");
    expect(employer?.pointsPrice).toBeNull();
    expect(catalog.wallets).toEqual([
      { provider: "JAWWALPAY", configured: false },
      { provider: "PALPAY", configured: false },
      { provider: "REFLECT", configured: false },
    ]);
  });

  it("returns the viewer's personal subscription with ISO dates", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "sub-1",
      userId: "user-1",
      companyId: null,
      planId: "plan-USER_PREMIUM",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-06-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
      providerSubscriptionId: null,
      cancelAtPeriodEnd: false,
      plan: {
        id: "plan-USER_PREMIUM",
        code: "USER_PREMIUM",
        name: "Diaspora Premium User",
        priceCents: 500,
        currency: "USD",
        intervalDays: 30,
        features: {},
        isActive: true,
      },
    });

    const result = await service.getBillingMe("user-1");

    expect(result.subscription).toMatchObject({
      id: "sub-1",
      status: "ACTIVE",
      currentPeriodEnd: "2026-07-01T00:00:00.000Z",
      plan: { code: "USER_PREMIUM" },
    });
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } },
      }),
    );

    prisma.subscription.findFirst.mockResolvedValue(null);
    expect((await service.getBillingMe("user-1")).subscription).toBeNull();
  });

  it("cancel flags the period end, is idempotent, and 404s without a subscription", async () => {
    const active = {
      id: "sub-1",
      userId: "user-1",
      companyId: null,
      planId: "plan-USER_PREMIUM",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-06-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
      providerSubscriptionId: null,
      cancelAtPeriodEnd: false,
    };
    prisma.subscription.findFirst.mockResolvedValue(active);
    prisma.subscription.update.mockResolvedValue({ ...active, cancelAtPeriodEnd: true });

    await service.cancelAtPeriodEnd("user-1");

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { cancelAtPeriodEnd: true },
    });

    // Already flagged — no second write.
    prisma.subscription.update.mockClear();
    prisma.subscription.findFirst.mockResolvedValue({ ...active, cancelAtPeriodEnd: true });
    await service.cancelAtPeriodEnd("user-1");
    expect(prisma.subscription.update).not.toHaveBeenCalled();

    prisma.subscription.findFirst.mockResolvedValue(null);
    await expect(service.cancelAtPeriodEnd("user-1")).rejects.toMatchObject({ status: 404 });
  });

  it("summarizes company billing: plan, job quota, and live credits", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "sub-9",
      userId: null,
      companyId: "company-1",
      planId: "plan_employer_basic",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-06-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
      providerSubscriptionId: null,
      cancelAtPeriodEnd: false,
      plan: {
        id: "plan_employer_basic",
        code: "EMPLOYER_BASIC",
        name: "Employer Basic",
        priceCents: 2900,
        currency: "USD",
        intervalDays: 30,
        features: { activeJobs: 5 },
        isActive: true,
      },
    });
    prisma.job.count.mockResolvedValue(3);
    prisma.employerCredit.findMany.mockResolvedValue([
      { kind: "FEATURED_SLOT", remaining: 1, expiresAt: new Date("2026-08-01T00:00:00Z") },
    ]);

    const summary = await service.getCompanyBillingSummary("company-1");

    expect(summary).toMatchObject({
      activeJobs: 3,
      jobLimit: 5,
      subscription: { plan: { code: "EMPLOYER_BASIC" } },
      credits: [{ kind: "FEATURED_SLOT", remaining: 1, expiresAt: "2026-08-01T00:00:00.000Z" }],
    });
    expect(prisma.employerCredit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: "company-1", remaining: { gt: 0 } }),
      }),
    );
  });

  it("lists bank-transfer receipts waiting for admin review", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-3",
        subscriptionId: "sub-3",
        planId: "plan-3",
        userId: null,
        companyId: "company-1",
        amountCents: 2900,
        currency: "USD",
        status: "OPEN",
        method: "BANK_TRANSFER",
        providerInvoiceId: null,
        bankReceiptUrl: "https://media.baydar.ps/receipt.jpg",
        dueAt: null,
        paidAt: null,
        pdfUrl: null,
        createdAt: new Date("2026-05-15T00:00:00Z"),
        user: null,
        company: { name: "شركة بيدر" },
      },
    ]);

    const result = await service.adminListInvoices("NEEDS_REVIEW", 25);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      companyName: "شركة بيدر",
      userEmail: null,
      userName: null,
    });
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { method: "BANK_TRANSFER", status: "OPEN", bankReceiptUrl: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    );
  });
});
