import { createDecipheriv, createHmac, timingSafeEqual } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

export class HyperPayCheckoutError extends Error {
  constructor(
    message: string,
    readonly retrySafe = false,
  ) {
    super(message);
  }
}

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

export interface HyperPayPayment {
  id: string;
  merchantTransactionId: string;
  amountCents: number;
  currency: string;
  resultCode?: string;
  raw: Record<string, unknown>;
}

@Injectable()
export class HyperPayClient {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async createCheckout(input: HyperPayCheckoutInput): Promise<HyperPayCheckoutResult> {
    const entityId = this.config.get("HYPERPAY_ENTITY_ID", { infer: true });
    const accessToken = this.config.get("HYPERPAY_ACCESS_TOKEN", { infer: true });
    if (!entityId || !accessToken) {
      throw new HyperPayCheckoutError("HyperPay is not configured.", true);
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
    const body = (await response.json().catch(() => ({}))) as {
      id?: unknown;
      result?: { code?: string; description?: string };
    };
    if (!response.ok || typeof body.id !== "string") {
      throw new HyperPayCheckoutError(
        `HyperPay checkout failed: ${body.result?.description ?? response.status}`,
      );
    }

    return {
      providerCheckoutId: body.id,
      checkoutUrl: `${endpoint}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(body.id)}`,
    };
  }

  async getCheckoutPayment(providerCheckoutId: string): Promise<HyperPayPayment> {
    const entityId = this.config.get("HYPERPAY_ENTITY_ID", { infer: true });
    const accessToken = this.config.get("HYPERPAY_ACCESS_TOKEN", { infer: true });
    if (!entityId || !accessToken) throw new Error("HyperPay is not configured.");

    const params = new URLSearchParams({ entityId });
    const baseUrl =
      this.config.get("HYPERPAY_BASE_URL", { infer: true }) ?? "https://eu-test.oppwa.com";
    const response = await fetch(
      `${baseUrl}/v1/checkouts/${encodeURIComponent(providerCheckoutId)}/payment?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new Error(`HyperPay payment lookup failed: ${response.status}`);
    if (
      typeof body.id !== "string" ||
      typeof body.merchantTransactionId !== "string" ||
      typeof body.amount !== "string" ||
      typeof body.currency !== "string"
    ) {
      throw new Error("HyperPay returned an invalid payment.");
    }
    const amountCents = Math.round(Number(body.amount) * 100);
    if (!Number.isSafeInteger(amountCents)) throw new Error("HyperPay returned an invalid amount.");

    const result = body.result as { code?: unknown } | undefined;
    return {
      id: body.id,
      merchantTransactionId: body.merchantTransactionId,
      amountCents,
      currency: body.currency.toUpperCase(),
      resultCode: typeof result?.code === "string" ? result.code : undefined,
      raw: body,
    };
  }

  getCheckoutUrl(providerCheckoutId: string): string {
    return `${this.checkoutEndpoint()}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(providerCheckoutId)}`;
  }

  verifyWebhookSignature(payload: unknown, signature: string | undefined): boolean {
    const secret = this.config.get("HYPERPAY_WEBHOOK_SECRET", { infer: true });
    if (!secret || !signature) return false;

    const expected = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  decryptWebhook(
    encryptedBody: string,
    initializationVector: string | undefined,
    authenticationTag: string | undefined,
  ): unknown {
    const secret = this.config.get("HYPERPAY_WEBHOOK_SECRET", { infer: true });
    if (
      !secret ||
      !/^[0-9a-f]{64}$/i.test(secret) ||
      !initializationVector ||
      !/^[0-9a-f]{24}$/i.test(initializationVector) ||
      !authenticationTag ||
      !/^[0-9a-f]{32}$/i.test(authenticationTag) ||
      !/^(?:[0-9a-f]{2})+$/i.test(encryptedBody)
    ) {
      return null;
    }

    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        Buffer.from(secret, "hex"),
        Buffer.from(initializationVector, "hex"),
      );
      decipher.setAuthTag(Buffer.from(authenticationTag, "hex"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(encryptedBody, "hex")),
        decipher.final(),
      ]).toString("utf8");
      return JSON.parse(plaintext) as unknown;
    } catch {
      // Invalid authentication, encoding, or JSON must never grant paid plans.
      return null;
    }
  }

  private checkoutEndpoint(): string {
    return this.config.get("HYPERPAY_BASE_URL", { infer: true }) ?? "https://eu-test.oppwa.com";
  }
}
