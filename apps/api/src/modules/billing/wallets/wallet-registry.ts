import type { WalletProvider } from "@baydar/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../../config/env";

import type { WalletCheckoutInput, WalletCheckoutResult, WalletClient } from "./wallet-client";

// Sprint 25 stubs, collapsed into data: every provider awaits merchant
// onboarding. Once an agreement is signed, replace that provider's entry with
// a real client class implementing WalletClient — do NOT fake success here.
const WALLET_SPECS: {
  provider: WalletProvider;
  label: string;
  envKeys: (keyof Env)[];
}[] = [
  {
    provider: "JAWWALPAY",
    label: "JawwalPay",
    envKeys: ["JAWWALPAY_MERCHANT_ID", "JAWWALPAY_API_KEY"],
  },
  { provider: "PALPAY", label: "PalPay", envKeys: ["PALPAY_MERCHANT_ID", "PALPAY_API_KEY"] },
  { provider: "REFLECT", label: "Reflect", envKeys: ["REFLECT_MERCHANT_ID", "REFLECT_API_KEY"] },
];

@Injectable()
export class WalletRegistry {
  private readonly byProvider: Record<WalletProvider, WalletClient>;

  constructor(config: ConfigService<Env, true>) {
    const entries = WALLET_SPECS.map(
      ({ provider, label, envKeys }): [WalletProvider, WalletClient] => {
        const instructions = `${label} support is coming soon. Use Card or Bank Transfer for now, or redeem Karama Points.`;
        return [
          provider,
          {
            provider,
            isConfigured: () => envKeys.every((key) => Boolean(config.get(key, { infer: true }))),
            async createCheckout(_input: WalletCheckoutInput): Promise<WalletCheckoutResult> {
              // TODO: real provider integration once merchant onboarding completes.
              return { provider, instructions };
            },
          },
        ];
      },
    );
    this.byProvider = Object.fromEntries(entries) as Record<WalletProvider, WalletClient>;
  }

  get(provider: WalletProvider): WalletClient {
    return this.byProvider[provider];
  }

  availability(): { provider: WalletProvider; configured: boolean }[] {
    return Object.values(this.byProvider).map((client) => ({
      provider: client.provider,
      configured: client.isConfigured(),
    }));
  }
}
