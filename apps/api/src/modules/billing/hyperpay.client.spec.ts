import { createHmac } from "node:crypto";

import type { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

import { HyperPayClient } from "./hyperpay.client";

function configWith(
  values: Partial<Record<keyof Env, string | undefined>>,
): ConfigService<Env, true> {
  return {
    get: jest.fn((key: string) => values[key as keyof Env]),
  } as unknown as ConfigService<Env, true>;
}

describe("HyperPayClient.verifyWebhookSignature", () => {
  const payload = { merchantTransactionId: "inv-1", result: { code: "000.000.000" } };
  const secret = "s3cret";

  it("fail-closed without secret or signature; accepts only matching HMAC", () => {
    expect(new HyperPayClient(configWith({})).verifyWebhookSignature(payload, "x")).toBe(false);
    expect(
      new HyperPayClient(configWith({ HYPERPAY_WEBHOOK_SECRET: secret })).verifyWebhookSignature(
        payload,
        undefined,
      ),
    ).toBe(false);
    const client = new HyperPayClient(configWith({ HYPERPAY_WEBHOOK_SECRET: secret }));
    const good = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    expect(client.verifyWebhookSignature(payload, good)).toBe(true);
    expect(client.verifyWebhookSignature(payload, "deadbeef")).toBe(false);
  });
});
