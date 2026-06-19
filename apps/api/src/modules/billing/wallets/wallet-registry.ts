import type { WalletProvider } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { JawwalPayClient } from "./jawwalpay.client";
import { PalPayClient } from "./palpay.client";
import { ReflectClient } from "./reflect.client";
import type { WalletClient } from "./wallet-client";

@Injectable()
export class WalletRegistry {
  private readonly byProvider: Record<WalletProvider, WalletClient>;

  constructor(
    private readonly jawwal: JawwalPayClient,
    private readonly palpay: PalPayClient,
    private readonly reflect: ReflectClient,
  ) {
    this.byProvider = {
      JAWWALPAY: this.jawwal,
      PALPAY: this.palpay,
      REFLECT: this.reflect,
    };
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
