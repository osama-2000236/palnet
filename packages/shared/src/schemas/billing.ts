import { z } from "zod";

export const PlanCode = {
  EMPLOYER_FREE: "EMPLOYER_FREE",
  EMPLOYER_BASIC: "EMPLOYER_BASIC",
  EMPLOYER_PRO: "EMPLOYER_PRO",
  FEATURED_SLOT: "FEATURED_SLOT",
  USER_PREMIUM: "USER_PREMIUM",
} as const;
export type PlanCode = (typeof PlanCode)[keyof typeof PlanCode];

export const SubscriptionStatus = {
  TRIALING: "TRIALING",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
  INCOMPLETE: "INCOMPLETE",
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const InvoiceStatus = {
  DRAFT: "DRAFT",
  OPEN: "OPEN",
  PAID: "PAID",
  VOID: "VOID",
  UNCOLLECTIBLE: "UNCOLLECTIBLE",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
  POINTS: "POINTS",
  JAWWALPAY: "JAWWALPAY",
  PALPAY: "PALPAY",
  REFLECT: "REFLECT",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const WalletProvider = {
  JAWWALPAY: "JAWWALPAY",
  PALPAY: "PALPAY",
  REFLECT: "REFLECT",
} as const;
export type WalletProvider = (typeof WalletProvider)[keyof typeof WalletProvider];

export const Plan = z.object({
  // Seeded plan rows use stable readable ids (plan_user_premium), not cuids.
  id: z.string().min(1),
  code: z.nativeEnum(PlanCode),
  name: z.string(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  intervalDays: z.number().int().positive().nullable(),
  features: z.record(z.unknown()),
  isActive: z.boolean(),
});
export type Plan = z.infer<typeof Plan>;

export const Invoice = z.object({
  id: z.string().cuid(),
  subscriptionId: z.string().cuid().nullable(),
  planId: z.string().min(1).nullable(),
  userId: z.string().cuid().nullable(),
  companyId: z.string().cuid().nullable(),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  status: z.nativeEnum(InvoiceStatus),
  method: z.nativeEnum(PaymentMethod),
  providerInvoiceId: z.string().nullable(),
  bankReceiptUrl: z.string().url().nullable(),
  dueAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  pdfUrl: z.string().url().nullable(),
  // Operator review audit trail — set when an admin approves or voids a
  // bank-transfer invoice. Null for automated payment paths.
  reviewedAt: z.string().datetime().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type Invoice = z.infer<typeof Invoice>;

// Admin billing-review shape: Invoice plus payer identity, so operators see
// who paid instead of cuids. Only the admin list endpoint returns these.
export const AdminInvoice = Invoice.extend({
  userEmail: z.string().nullable(),
  userName: z.string().nullable(),
  companyName: z.string().nullable(),
});
export type AdminInvoice = z.infer<typeof AdminInvoice>;

export const Subscription = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid().nullable(),
  companyId: z.string().cuid().nullable(),
  planId: z.string().min(1),
  status: z.nativeEnum(SubscriptionStatus),
  currentPeriodStart: z.string().datetime().nullable(),
  currentPeriodEnd: z.string().datetime().nullable(),
  providerSubscriptionId: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  plan: Plan.optional(),
});
export type Subscription = z.infer<typeof Subscription>;

// Plan as offered to the viewer: server converts the USD list price into the
// viewer's display currency and attaches the Karama points price when the
// plan is redeemable with points (currently USER_PREMIUM only).
export const PlanOffer = Plan.extend({
  displayAmountCents: z.number().int().nonnegative(),
  displayCurrency: z.string().length(3),
  pointsPrice: z.number().int().positive().nullable(),
});
export type PlanOffer = z.infer<typeof PlanOffer>;

export const WalletAvailability = z.object({
  provider: z.nativeEnum(WalletProvider),
  configured: z.boolean(),
});
export type WalletAvailability = z.infer<typeof WalletAvailability>;

// Static bank-transfer destination (env-configured). Null when the rail is
// not configured — clients must then withhold the bank-transfer method
// instead of ever showing a placeholder IBAN.
export const BankTransferDestination = z.object({
  beneficiary: z.string(),
  iban: z.string(),
});
export type BankTransferDestination = z.infer<typeof BankTransferDestination>;

export const BillingCatalog = z.object({
  plans: z.array(PlanOffer),
  wallets: z.array(WalletAvailability),
  bankTransfer: BankTransferDestination.nullable(),
});
export type BillingCatalog = z.infer<typeof BillingCatalog>;

// Viewer's own billing state: the active personal subscription (company
// subscriptions live on the employer billing surface instead).
export const BillingMe = z.object({
  subscription: Subscription.nullable(),
});
export type BillingMe = z.infer<typeof BillingMe>;

export const EmployerCreditKind = {
  FEATURED_SLOT: "FEATURED_SLOT",
  JOB_POST: "JOB_POST",
  APPLICATION_BOOST: "APPLICATION_BOOST",
} as const;
export type EmployerCreditKind = (typeof EmployerCreditKind)[keyof typeof EmployerCreditKind];

export const EmployerCreditSummary = z.object({
  kind: z.nativeEnum(EmployerCreditKind),
  remaining: z.number().int().nonnegative(),
  expiresAt: z.string().datetime().nullable(),
});
export type EmployerCreditSummary = z.infer<typeof EmployerCreditSummary>;

// Billing state of one company, for owners/admins: the active company
// subscription, how much of the job quota is used, and unspent credits.
export const CompanyBillingSummary = z.object({
  subscription: Subscription.nullable(),
  activeJobs: z.number().int().nonnegative(),
  jobLimit: z.number().int().positive(),
  credits: z.array(EmployerCreditSummary),
});
export type CompanyBillingSummary = z.infer<typeof CompanyBillingSummary>;

export const CheckoutSessionBody = z.object({
  planCode: z.nativeEnum(PlanCode),
  companyId: z.string().cuid().optional(),
  returnUrl: z.string().url(),
  method: z.nativeEnum(PaymentMethod).default("CARD"),
});
export type CheckoutSessionBody = z.infer<typeof CheckoutSessionBody>;

export const CheckoutSession = z.object({
  invoiceId: z.string().cuid(),
  method: z.nativeEnum(PaymentMethod),
  // Card checkout: providerCheckoutId + redirect/script URL the client renders.
  providerCheckoutId: z.string().nullable(),
  checkoutUrl: z.string().url().nullable(),
  // Bank transfer: payment instructions for the user.
  bankTransfer: z
    .object({
      beneficiary: z.string(),
      iban: z.string(),
      reference: z.string(),
      amountCents: z.number().int(),
      currency: z.string().length(3),
    })
    .nullable(),
  // Local wallet (JawwalPay / PalPay / Reflect). Populated only when a real
  // provider client is configured; otherwise `instructions` carries a human
  // explanation that wallet support is coming soon.
  wallet: z
    .object({
      provider: z.nativeEnum(WalletProvider),
      deepLink: z.string().optional(),
      ussd: z.string().optional(),
      voucherId: z.string().optional(),
      instructions: z.string(),
    })
    .nullable()
    .default(null),
  // Display layer: server localizes amount into the viewer's preferred
  // currency (ILS for ar-PS, JOD for jo, USD fallback). UI shows the display
  // amount + currency and optionally a parenthetical original USD amount.
  displayAmountCents: z.number().int().nonnegative(),
  displayCurrency: z.string().length(3),
});
export type CheckoutSession = z.infer<typeof CheckoutSession>;

export const BankTransferReceiptBody = z.object({
  receiptUrl: z.string().url(),
  note: z.string().max(500).optional(),
});
export type BankTransferReceiptBody = z.infer<typeof BankTransferReceiptBody>;

export const AdminInvoiceActionBody = z.object({
  action: z.enum(["MARK_PAID", "VOID"]),
  note: z.string().max(500).optional(),
});
export type AdminInvoiceActionBody = z.infer<typeof AdminInvoiceActionBody>;
