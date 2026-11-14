import { createCipheriv, createHmac } from "node:crypto";

import type { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

import { HyperPayClient } from "./hyperpay.client";

describe("HyperPayClient webhook authentication", () => {
  const secret = "11".repeat(32);
  const payload = { merchantTransactionId: "invoice_123", result: { code: "000.000.0" } };
  const client = (webhookSecret?: string) =>
    new HyperPayClient({ get: () => webhookSecret } as unknown as ConfigService<Env, true>);

  function encrypt(value: unknown, raw = false) {
    const initializationVector = Buffer.alloc(12, 7);
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(secret, "hex"), initializationVector);
    const encryptedBody = Buffer.concat([
      cipher.update(raw ? String(value) : JSON.stringify(value), "utf8"),
      cipher.final(),
    ]).toString("hex");
    return {
      encryptedBody,
      initializationVector: initializationVector.toString("hex"),
      authenticationTag: cipher.getAuthTag().toString("hex"),
    };
  }

  it("keeps verifying the legacy signed body contract", () => {
    const signature = createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    expect(client(secret).verifyWebhookSignature(payload, signature)).toBe(true);
    expect(client(secret).verifyWebhookSignature(payload, "00".repeat(32))).toBe(false);
    expect(client().verifyWebhookSignature(payload, signature)).toBe(false);
  });

  it("decrypts an authenticated AES-256-GCM event", () => {
    const event = encrypt(payload);
    expect(
      client(secret).decryptWebhook(
        event.encryptedBody,
        event.initializationVector,
        event.authenticationTag,
      ),
    ).toEqual(payload);
  });

  it("rejects missing configuration, incorrect keys, and tampering", () => {
    const event = encrypt(payload);
    const decrypt = (webhookSecret?: string) =>
      client(webhookSecret).decryptWebhook(
        event.encryptedBody,
        event.initializationVector,
        event.authenticationTag,
      );

    expect(decrypt()).toBeNull();
    expect(decrypt("22".repeat(32))).toBeNull();
    expect(
      client(secret).decryptWebhook(
        `00${event.encryptedBody.slice(2)}`,
        event.initializationVector,
        event.authenticationTag,
      ),
    ).toBeNull();
  });

  it("rejects missing or malformed encryption fields and invalid JSON", () => {
    const event = encrypt(payload);
    expect(
      client(secret).decryptWebhook(event.encryptedBody, undefined, event.authenticationTag),
    ).toBeNull();
    expect(
      client(secret).decryptWebhook(event.encryptedBody, event.initializationVector, "not-a-tag"),
    ).toBeNull();
    expect(
      client(secret).decryptWebhook("not-hex", event.initializationVector, event.authenticationTag),
    ).toBeNull();

    const invalidJson = encrypt("not-json", true);
    expect(
      client(secret).decryptWebhook(
        invalidJson.encryptedBody,
        invalidJson.initializationVector,
        invalidJson.authenticationTag,
      ),
    ).toBeNull();
  });
});
