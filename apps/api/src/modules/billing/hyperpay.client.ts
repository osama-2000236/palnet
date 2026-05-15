import { createHmac, timingSafeEqual } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

export interface HyperPayCheckoutInput {
  invoiceId: string;
  amountCents: number;
  currency: string;
  returnUrl: string;
  customerEmail: string;
}

export interface HyperPayCheckoutResult {
  providerCheckoutId: string;
  checkoutUrl: string;
}

@Injectable()
export class HyperPayClient {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async createCheckout(input: HyperPayCheckoutInput): Promise<HyperPayCheckoutResult> {
    const entityId = this.config.get("HYPERPAY_ENTITY_ID", { infer: true });
    const accessToken = this.config.get("HYPERPAY_ACCESS_TOKEN", { infer: true });
    if (!entityId || !accessToken) {
      throw new Error("HyperPay is not configured.");
    }

    const endpoint = this.checkoutEndpoint();
    const params = new URLSearchParams({
      entityId,
      amount: (input.amountCents / 100).toFixed(2),
      currency: input.currency,
      paymentType: "DB",
      merchantTransactionId: input.invoiceId,
      "customer.email": input.customerEmail,
      shopperResultUrl: input.returnUrl,
    });

    const response = await fetch(`${endpoint}/v1/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: unknown; result?: { code?: string; description?: string } };
    if (!response.ok || typeof body.id !== "string") {
      throw new Error(`HyperPay checkout failed: ${body.result?.description ?? response.status}`);
    }

    return {
      providerCheckoutId: body.id,
      checkoutUrl: `${endpoint}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(body.id)}`,
    };
  }

  verifyWebhookSignature(payload: unknown, signature: string | undefined): boolean {
    const secret = this.config.get("HYPERPAY_WEBHOOK_SECRET", { infer: true });
    if (!secret) return true;
    if (!signature) return false;

    const expected = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private checkoutEndpoint(): string {
    return this.config.get("HYPERPAY_BASE_URL", { infer: true }) ?? "https://eu-test.oppwa.com";
  }
}
