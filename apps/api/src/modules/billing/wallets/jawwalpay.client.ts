import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../../config/env";

import type { WalletCheckoutInput, WalletCheckoutResult, WalletClient } from "./wallet-client";

const COMING_SOON_INSTRUCTIONS =
  "JawwalPay support is coming soon. Use Card or Bank Transfer for now, or redeem Karama Points.";

// Sprint 25 stub. Once we sign the JawwalPay merchant agreement, the API key
// and merchant id arrive via env and `createCheckout` calls the real provider
// to mint a deep link / USSD code that the mobile client launches.
@Injectable()
export class JawwalPayClient implements WalletClient {
  readonly provider = "JAWWALPAY" as const;

  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get("JAWWALPAY_MERCHANT_ID", { infer: true }) &&
      this.config.get("JAWWALPAY_API_KEY", { infer: true }),
    );
  }

  async createCheckout(_input: WalletCheckoutInput): Promise<WalletCheckoutResult> {
    if (!this.isConfigured()) {
      return {
        provider: this.provider,
        instructions: COMING_SOON_INSTRUCTIONS,
      };
    }
    // TODO: real JawwalPay integration once merchant onboarding completes.
    return {
      provider: this.provider,
      instructions: COMING_SOON_INSTRUCTIONS,
    };
  }
}
