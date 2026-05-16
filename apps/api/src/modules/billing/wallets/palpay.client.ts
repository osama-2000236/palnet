import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../../config/env";

import type { WalletCheckoutInput, WalletCheckoutResult, WalletClient } from "./wallet-client";

const COMING_SOON_INSTRUCTIONS =
  "PalPay support is coming soon. Use Card or Bank Transfer for now, or redeem Karama Points.";

@Injectable()
export class PalPayClient implements WalletClient {
  readonly provider = "PALPAY" as const;

  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get("PALPAY_MERCHANT_ID", { infer: true }) &&
      this.config.get("PALPAY_API_KEY", { infer: true }),
    );
  }

  async createCheckout(_input: WalletCheckoutInput): Promise<WalletCheckoutResult> {
    if (!this.isConfigured()) {
      return { provider: this.provider, instructions: COMING_SOON_INSTRUCTIONS };
    }
    // TODO: real PalPay integration once merchant onboarding completes.
    return { provider: this.provider, instructions: COMING_SOON_INSTRUCTIONS };
  }
}
