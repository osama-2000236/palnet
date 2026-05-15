import type { WalletProvider } from "@baydar/shared";

// Shared shape every wallet client (JawwalPay, PalPay, Reflect) implements
// once a merchant agreement and credentials are in place. Until then the
// concrete classes throw NOT_IMPLEMENTED but expose a typed `instructions`
// payload so the UI can render a "Coming soon" tile rather than a hard error.
export interface WalletCheckoutInput {
  invoiceId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
}

export interface WalletCheckoutResult {
  provider: WalletProvider;
  deepLink?: string;
  ussd?: string;
  voucherId?: string;
  instructions: string;
}

export interface WalletClient {
  readonly provider: WalletProvider;
  isConfigured(): boolean;
  createCheckout(input: WalletCheckoutInput): Promise<WalletCheckoutResult>;
}
