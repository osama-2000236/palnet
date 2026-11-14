import { createHash } from "node:crypto";

import { Prisma } from "@baydar/db";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { KaramaService } from "../karama/karama.service";
import { PrismaService } from "../prisma/prisma.service";

import { BillingService } from "./billing.service";
import { HyperPayCheckoutError, HyperPayClient } from "./hyperpay.client";
import { WalletRegistry } from "./wallets/wallet-registry";

type PrismaStub = {
  plan: { upsert: jest.Mock };
  user: { findUnique: jest.Mock };
  companyMember: { findFirst: jest.Mock; findMany: jest.Mock };
  subscription: { create: jest.Mock };
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
    subscription: { create: jest.fn() },
    invoice: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
  let hyperpay: {
    createCheckout: jest.Mock;
    getCheckoutUrl: jest.Mock;
    decryptWebhook: jest.Mock;
    verifyWebhookSignature: jest.Mock;
    getCheckoutPayment: jest.Mock;
  };
  let tx: {
    invoice: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    payment: { create: jest.Mock };
    subscription: { create: jest.Mock; update: jest.Mock };
    employerCredit: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = buildPrisma();
    hyperpay = {
      createCheckout: jest.fn(),
      getCheckoutUrl: jest.fn((id: string) => `https://hyperpay.test/${id}`),
      getCheckoutPayment: jest.fn().mockResolvedValue({
        id: "pay-1",
        merchantTransactionId: "inv-1",
        amountCents: 9900,
        currency: "USD",
        resultCode: "000.000.000",
        raw: { id: "pay-1" },
      }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      decryptWebhook: jest.fn().mockReturnValue({
        type: "PAYMENT",
        payload: {
          merchantTransactionId: "inv-1",
          paymentId: "pay-1",
          result: { code: "000.000.000" },
        },
      }),
    };
    tx = {
      invoice: {
        create: jest.fn((input) => prisma.invoice.create(input)),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn(),
      },
      payment: { create: jest.fn() },
      subscription: {
        create: jest.fn((input) => prisma.subscription.create(input)),
        update: jest.fn(),
      },
      employerCredit: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(tx as never));
    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: HyperPayClient, useValue: hyperpay },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string) =>
                ({ BANK_TRANSFER_IBAN: "PS00TEST", BANK_TRANSFER_BENEFICIARY: "Baydar" })[key],
            ),
          },
        },
        {
          provide: KaramaService,
          useValue: {
            redeem: jest.fn(),
            award: jest.fn(),
            awardOnce: jest.fn(),
            getMonthlyEarnings: jest.fn(),
            getBalance: jest.fn(),
          },
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

  it("rejects a mismatched payment using the stored HyperPay checkout id", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      providerInvoiceId: "checkout-1",
      amountCents: 9900,
      currency: "USD",
    });
    hyperpay.getCheckoutPayment.mockResolvedValue({
      id: "pay-1",
      merchantTransactionId: "different-invoice",
      amountCents: 9900,
      currency: "USD",
      resultCode: "000.000.000",
      raw: {},
    });

    await expect(service.handleHyperPayWebhook("encrypted", "iv", "tag")).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    expect(hyperpay.getCheckoutPayment).toHaveBeenCalledWith("checkout-1");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts the legacy signed body while still verifying payment with HyperPay", async () => {
    const body = { merchantTransactionId: "inv-1", paymentId: "pay-1" };
    prisma.invoice.findUnique.mockResolvedValue({
      providerInvoiceId: "checkout-1",
      amountCents: 9900,
      currency: "USD",
    });
    hyperpay.getCheckoutPayment.mockResolvedValue({
      id: "pay-1",
      merchantTransactionId: "inv-1",
      amountCents: 100,
      currency: "USD",
      resultCode: "000.000.000",
      raw: {},
    });

    await expect(service.handleHyperPayWebhook(body, "legacy-signature")).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    expect(hyperpay.verifyWebhookSignature).toHaveBeenCalledWith(body, "legacy-signature");
    expect(hyperpay.getCheckoutPayment).toHaveBeenCalledWith("checkout-1");
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

    const result = await service.handleHyperPayWebhook("encrypted", "iv", "tag");

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
    await service.handleHyperPayWebhook("encrypted", "iv", "tag");
    expect(tx.payment.create).toHaveBeenCalledTimes(1);
  });

  it("rejects a HyperPay payment that does not match the invoice", async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      providerInvoiceId: "checkout-1",
      amountCents: 9900,
      currency: "USD",
    });
    hyperpay.getCheckoutPayment.mockResolvedValue({
      id: "pay-1",
      merchantTransactionId: "inv-1",
      amountCents: 100,
      currency: "USD",
      resultCode: "000.000.000",
      raw: {},
    });

    await expect(service.handleHyperPayWebhook("encrypted", "iv", "tag")).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    expect(hyperpay.getCheckoutPayment).toHaveBeenCalledWith("checkout-1");
    expect(prisma.$transaction).not.toHaveBeenCalled();
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

    const result = await service.adminInvoiceAction("inv-2", { action: "MARK_PAID" });

    expect(result.status).toBe("PAID");
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-2" },
      data: expect.objectContaining({ status: "ACTIVE" }),
    });
  });

  it("rejects an unauthenticated HyperPay webhook payload", async () => {
    hyperpay.decryptWebhook.mockReturnValue(null);

    await expect(
      service.handleHyperPayWebhook("invalid", "bogus-iv", "bogus-tag"),
    ).rejects.toMatchObject({ code: "AUTH_UNAUTHORIZED" });
    expect(prisma.invoice.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
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
      },
    ]);

    const result = await service.adminListInvoices("NEEDS_REVIEW", 25);

    expect(result).toHaveLength(1);
    expect(prisma.invoice.findMany).toHaveBeenCalledWith({
      where: { method: "BANK_TRANSFER", status: "OPEN", bankReceiptUrl: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
  });

  it("replays a keyed card checkout without calling HyperPay again", async () => {
    prisma.plan.upsert.mockResolvedValue({
      id: "plan-1",
      code: "USER_PREMIUM",
      priceCents: 9900,
      currency: "USD",
      intervalDays: 30,
    });
    prisma.user.findUnique.mockResolvedValue({ email: "owner@baydar.ps", locale: "en" });
    prisma.subscription.create.mockResolvedValue({ id: "sub-1" });
    prisma.invoice.create.mockResolvedValue({
      id: "inv-card-1",
      providerInvoiceId: null,
    });
    prisma.invoice.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.findUnique.mockResolvedValueOnce(null);
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-card-1",
      amountCents: 9900,
      currency: "USD",
      providerInvoiceId: null,
    });
    hyperpay.createCheckout.mockResolvedValue({
      providerCheckoutId: "checkout-1",
      checkoutUrl: "https://hyperpay.test/checkout-1",
    });
    const body = {
      planCode: "USER_PREMIUM" as const,
      returnUrl: "https://baydar.ps/billing/return",
      method: "CARD" as const,
      idempotencyKey: "checkout-request-123456",
    };

    const first = await service.createCheckoutSession("user-1", body);
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-card-1",
      providerInvoiceId: "checkout-1",
      checkoutFingerprint: (
        prisma.invoice.create.mock.calls[0][0] as { data: { checkoutFingerprint: string } }
      ).data.checkoutFingerprint,
    });
    const replay = await service.createCheckoutSession("user-1", body);

    expect(first).toMatchObject({ invoiceId: "inv-card-1", providerCheckoutId: "checkout-1" });
    expect(replay).toMatchObject({ invoiceId: "inv-card-1", providerCheckoutId: "checkout-1" });
    expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.invoice.create).toHaveBeenCalledTimes(1);
    expect(hyperpay.createCheckout).toHaveBeenCalledTimes(1);
  });

  it("rejects reuse of a checkout key with different parameters", async () => {
    prisma.plan.upsert.mockResolvedValue({
      id: "plan-1",
      code: "USER_PREMIUM",
      priceCents: 9900,
      currency: "USD",
      intervalDays: 30,
    });
    prisma.user.findUnique.mockResolvedValue({ email: "owner@baydar.ps", locale: "en" });
    prisma.invoice.findUnique.mockResolvedValue({
      id: "inv-card-1",
      providerInvoiceId: "checkout-1",
      checkoutFingerprint: "different-request",
    });

    await expect(
      service.createCheckoutSession("user-1", {
        planCode: "USER_PREMIUM",
        returnUrl: "https://baydar.ps/billing/return",
        method: "CARD",
        idempotencyKey: "checkout-request-123456",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(hyperpay.createCheckout).not.toHaveBeenCalled();
  });

  it("resolves a checkout uniqueness collision to the original checkout", async () => {
    prisma.plan.upsert.mockResolvedValue({
      id: "plan-1",
      code: "USER_PREMIUM",
      priceCents: 9900,
      currency: "USD",
      intervalDays: 30,
    });
    prisma.user.findUnique.mockResolvedValue({ email: "owner@baydar.ps", locale: "en" });
    const returnUrl = "https://baydar.ps/billing/return";
    const checkoutFingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          userId: "user-1",
          planId: "plan-1",
          companyId: null,
          intervalDays: 30,
          method: "CARD",
          amountCents: 9900,
          currency: "USD",
          returnUrl,
        }),
      )
      .digest("hex");
    prisma.invoice.findUnique.mockResolvedValueOnce(null);
    prisma.$transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Duplicate checkout key", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["Invoice_checkoutKey_key"] },
      }),
    );
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-card-1",
      providerInvoiceId: "checkout-1",
      checkoutFingerprint,
    });

    const result = await service.createCheckoutSession("user-1", {
      planCode: "USER_PREMIUM",
      returnUrl,
      method: "CARD",
      idempotencyKey: "checkout-request-123456",
    });

    expect(result).toMatchObject({ invoiceId: "inv-card-1", providerCheckoutId: "checkout-1" });
    expect(tx.invoice.create).not.toHaveBeenCalled();
    expect(hyperpay.createCheckout).not.toHaveBeenCalled();
  });

  it("fails closed when another request already claimed card processing", async () => {
    prisma.plan.upsert.mockResolvedValue({
      id: "plan-1",
      code: "USER_PREMIUM",
      priceCents: 9900,
      currency: "USD",
      intervalDays: 30,
    });
    prisma.user.findUnique.mockResolvedValue({ email: "owner@baydar.ps", locale: "en" });
    prisma.subscription.create.mockResolvedValue({ id: "sub-1" });
    prisma.invoice.create.mockResolvedValue({ id: "inv-card-1", providerInvoiceId: null });
    prisma.invoice.findUnique.mockResolvedValueOnce(null);
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-card-1",
      providerInvoiceId: null,
    });

    await expect(
      service.createCheckoutSession("user-1", {
        planCode: "USER_PREMIUM",
        returnUrl: "https://baydar.ps/billing/return",
        method: "CARD",
        idempotencyKey: "checkout-request-123456",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(hyperpay.createCheckout).not.toHaveBeenCalled();
  });

  it("releases the processing claim only for a provably safe retry", async () => {
    prisma.plan.upsert.mockResolvedValue({
      id: "plan-1",
      code: "USER_PREMIUM",
      priceCents: 9900,
      currency: "USD",
      intervalDays: 30,
    });
    prisma.user.findUnique.mockResolvedValue({ email: "owner@baydar.ps", locale: "en" });
    prisma.subscription.create.mockResolvedValue({ id: "sub-1" });
    prisma.invoice.create.mockResolvedValue({ id: "inv-card-1", providerInvoiceId: null });
    prisma.invoice.findUnique.mockResolvedValue(null);
    prisma.invoice.updateMany.mockResolvedValue({ count: 1 });
    prisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: "inv-card-1",
      amountCents: 9900,
      currency: "USD",
      providerInvoiceId: null,
    });
    const body = {
      planCode: "USER_PREMIUM" as const,
      returnUrl: "https://baydar.ps/billing/return",
      method: "CARD" as const,
      idempotencyKey: "checkout-request-123456",
    };
    hyperpay.createCheckout.mockRejectedValue(new TypeError("fetch failed"));

    await expect(service.createCheckoutSession("user-1", body)).rejects.toThrow("fetch failed");
    expect(prisma.invoice.update).not.toHaveBeenCalled();

    hyperpay.createCheckout.mockRejectedValue(
      new HyperPayCheckoutError("HyperPay is not configured.", true),
    );
    await expect(service.createCheckoutSession("user-1", body)).rejects.toThrow(
      "HyperPay is not configured.",
    );
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-card-1" },
      data: { checkoutProcessingAt: null },
    });
  });
});
