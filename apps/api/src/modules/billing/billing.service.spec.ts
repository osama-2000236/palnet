import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { KaramaService } from "../karama/karama.service";
import { PrismaService } from "../prisma/prisma.service";

import { BillingService } from "./billing.service";
import { HyperPayClient } from "./hyperpay.client";
import { WalletRegistry } from "./wallets/wallet-registry";

type PrismaStub = {
  plan: { upsert: jest.Mock };
  user: { findUnique: jest.Mock };
  companyMember: { findFirst: jest.Mock; findMany: jest.Mock };
  subscription: { create: jest.Mock };
  invoice: {
    create: jest.Mock;
    update: jest.Mock;
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
  let tx: {
    invoice: { update: jest.Mock };
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
    tx = {
      invoice: { update: jest.fn() },
      payment: { create: jest.fn() },
      subscription: { update: jest.fn() },
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
    tx.invoice.update.mockResolvedValue({
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
    tx.invoice.update.mockResolvedValue({
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
});
