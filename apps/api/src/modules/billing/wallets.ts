import type { WalletProvider } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

export interface WalletCheckoutResult {
  provider: WalletProvider;
  deepLink?: string;
  ussd?: string;
  voucherId?: string;
  instructions: string;
}

/**
 * Local-wallet providers for the Palestinian market. Every one of them awaits
 * merchant onboarding, so this is a TABLE — not a `WalletClient` interface with
 * three closures that return the same canned sentence.
 *
 * When an agreement is signed, give THAT provider a real client class, call it
 * from `checkout()`, and flip its `client` flag here; the others stay table
 * rows. Do NOT fake success here.
 *
 * `client` is deliberately a code fact, not an env lookup. It used to be
 * `envKeys.every(set)` over `JAWWALPAY_*` / `PALPAY_*` / `REFLECT_*`, which
 * asked the wrong question: credentials present is not the same as a client
 * that can spend them. Setting a merchant id would have marked the provider
 * configured, so `getCatalog` would offer it as a real method, and
 * `createCheckout` would mint an invoice and then hand back the coming-soon
 * sentence — the dead invoice the availability flag exists to prevent. Six
 * env vars nobody could safely set went with the check.
 */
const WALLET_SPECS = {
  JAWWALPAY: { label: "JawwalPay", client: false },
  PALPAY: { label: "PalPay", client: false },
  REFLECT: { label: "Reflect", client: false },
} as const satisfies Record<WalletProvider, { label: string; client: boolean }>;

const PROVIDERS = Object.keys(WALLET_SPECS) as WalletProvider[];

@Injectable()
export class WalletRegistry {
  checkout(provider: WalletProvider): WalletCheckoutResult {
    const { label } = WALLET_SPECS[provider];
    return {
      provider,
      instructions: `${label} support is coming soon. Use Card or Bank Transfer for now, or redeem Karama Points.`,
    };
  }

  availability(): { provider: WalletProvider; configured: boolean }[] {
    return PROVIDERS.map((provider) => ({
      provider,
      configured: WALLET_SPECS[provider].client,
    }));
  }
}
