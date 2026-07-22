import { createHmac } from "node:crypto";

import type { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

import { HyperPayClient } from "./hyperpay.client";

function configWith(values: Partial<Record<keyof Env, string | undefined>>): ConfigService<Env, true> {
  return {
    get: jest.fn((key: string) => values[key as keyof Env]),
  } as unknown as ConfigService<Env, true>;
}

describe("HyperPayClient.verifyWebhookSignature", () => {
  const payload = { merchantTransactionId: "inv-1", result: { code: "000.000.000" } };

  it("rejects when HYPERPAY_WEBHOOK_SECRET is not configured (fail closed)", () => {
    const client = new HyperPayClient(configWith({}));
    expect(client.verifyWebhookSignature(payload, "anything")).toBe(false);
  });

  it("rejects when signature header is missing", () => {
    const client = new HyperPayClient(configWith({ HYPERPAY_WEBHOOK_SECRET: "s3cret" }));
    expect(client.verifyWebhookSignature(payload, undefined)).toBe(false);
  });

  it("rejects a forged signature", () => {
    const client = new HyperPayClient(configWith({ HYPERPAY_WEBHOOK_SECRET: "s3cret" }));
    expect(client.verifyWebhookSignature(payload, "deadbeef")).toBe(false);
  });

  it("accepts a valid HMAC-SHA256 hex signature", () => {
    const secret = "s3cret";
    const client = new HyperPayClient(configWith({ HYPERPAY_WEBHOOK_SECRET: secret }));
    const expected = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    expect(client.verifyWebhookSignature(payload, expected)).toBe(true);
  });

  it("rejects valid signature for a different payload body", () => {
    const secret = "s3cret";
    const client = new HyperPayClient(configWith({ HYPERPAY_WEBHOOK_SECRET: secret }));
    const expected = createHmac("sha256", secret)
      .update(JSON.stringify({ ...payload, amount: "0.01" }))
      .digest("hex");
    expect(client.verifyWebhookSignature(payload, expected)).toBe(false);
  });
});
