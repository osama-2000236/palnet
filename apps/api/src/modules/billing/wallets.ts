import type { WalletProvider } from "@baydar/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

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
 * When an agreement is signed, give THAT provider a real client class and call
 * it from `checkout()`; the others stay table rows. Do NOT fake success here.
 */
const WALLET_SPECS = {
  JAWWALPAY: { label: "JawwalPay", envKeys: ["JAWWALPAY_MERCHANT_ID", "JAWWALPAY_API_KEY"] },
  PALPAY: { label: "PalPay", envKeys: ["PALPAY_MERCHANT_ID", "PALPAY_API_KEY"] },
  REFLECT: { label: "Reflect", envKeys: ["REFLECT_MERCHANT_ID", "REFLECT_API_KEY"] },
} as const satisfies Record<WalletProvider, { label: string; envKeys: readonly (keyof Env)[] }>;

const PROVIDERS = Object.keys(WALLET_SPECS) as WalletProvider[];

@Injectable()
export class WalletRegistry {
  constructor(private readonly config: ConfigService<Env, true>) {}

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
      configured: WALLET_SPECS[provider].envKeys.every((key) =>
        Boolean(this.config.get(key, { infer: true })),
      ),
    }));
  }
}
