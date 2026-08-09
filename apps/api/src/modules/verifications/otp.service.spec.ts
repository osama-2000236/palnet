import { OTP_LIMITS } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { OtpService, hashPhone } from "./otp.service";

/**
 * A six-digit code is a 20-bit secret. Everything that makes it safe is around
 * it, so this is a test of the walls rather than of the code: single use, five
 * attempts then burnt, ten minutes, and a per-number daily cap.
 *
 * Each `it` below corresponds to one wall. Removing any one of them makes the
 * code guessable, and the test that fails names which.
 */
interface OtpRow {
  id: string;
  phoneE164: string;
  codeHash: string;
  purpose: string;
  refId: string | null;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  createdAt: Date;
}

function buildPrisma(rows: OtpRow[] = []) {
  const store = [...rows];
  let nextId = store.length + 1;

  const matches = (row: OtpRow, where: Record<string, unknown>): boolean => {
    if (where.id !== undefined && row.id !== where.id) return false;
    if (where.phoneE164 !== undefined && row.phoneE164 !== where.phoneE164) return false;
    if (where.purpose !== undefined && row.purpose !== where.purpose) return false;
    if (where.refId !== undefined && row.refId !== where.refId) return false;
    if (where.consumedAt === null && row.consumedAt !== null) return false;
    const expires = where.expiresAt as { gt?: Date; lt?: Date } | undefined;
    if (expires?.gt && row.expiresAt <= expires.gt) return false;
    if (expires?.lt && row.expiresAt >= expires.lt) return false;
    const created = where.createdAt as { gte?: Date } | undefined;
    if (created?.gte && row.createdAt < created.gte) return false;
    return true;
  };

  return {
    store,
    phoneOtp: {
      create: jest.fn(({ data }: { data: Partial<OtpRow> }) => {
        const row: OtpRow = {
          id: `otp_${nextId++}`,
          phoneE164: data.phoneE164 ?? "",
          codeHash: data.codeHash ?? "",
          purpose: data.purpose ?? "PHONE_VERIFY",
          refId: data.refId ?? null,
          expiresAt: data.expiresAt ?? new Date(),
          consumedAt: null,
          attempts: 0,
          createdAt: new Date(),
        };
        store.push(row);
        return Promise.resolve(row);
      }),
      findFirst: jest.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve([...store].reverse().find((row) => matches(row, where)) ?? null),
      ),
      count: jest.fn(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(store.filter((row) => matches(row, where)).length),
      ),
      update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<OtpRow> }) => {
        const row = store.find((r) => r.id === where.id);
        if (row) Object.assign(row, data);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn(
        ({ where, data }: { where: Record<string, unknown>; data: Partial<OtpRow> }) => {
          const hits = store.filter((row) => matches(row, where));
          for (const row of hits) Object.assign(row, data);
          return Promise.resolve({ count: hits.length });
        },
      ),
      deleteMany: jest.fn(({ where }: { where: Record<string, unknown> }) => {
        const hits = store.filter((row) => matches(row, where));
        for (const row of hits) store.splice(store.indexOf(row), 1);
        return Promise.resolve({ count: hits.length });
      }),
    },
  };
}

const PHONE = "+970599123456";

async function build(rows: OtpRow[] = []) {
  const prisma = buildPrisma(rows);
  const moduleRef = await Test.createTestingModule({
    providers: [OtpService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return { service: moduleRef.get(OtpService), prisma };
}

describe("OtpService", () => {
  it("never stores the plaintext code", async () => {
    const { service, prisma } = await build();
    const { code } = await service.issue(PHONE, "PHONE_VERIFY");
    expect(code).toMatch(/^\d{6}$/);
    // A leaked table of live OTPs must not be a leaked table of accounts.
    expect(prisma.store.map((r) => r.codeHash)).not.toContain(code);
  });

  it("spends any live code for the same number before minting a new one", async () => {
    // Two valid codes at once doubles an attacker's chances and leaves the
    // member guessing which SMS to read.
    const { service, prisma } = await build();
    await service.issue(PHONE, "PHONE_VERIFY");
    await service.issue(PHONE, "PHONE_VERIFY");
    expect(prisma.store.filter((r) => r.consumedAt === null)).toHaveLength(1);
  });

  it("accepts the right code once, and only once", async () => {
    const { service } = await build();
    const { code } = await service.issue(PHONE, "PHONE_VERIFY");
    await expect(service.consume(PHONE, "PHONE_VERIFY", code)).resolves.toEqual({ refId: null });
    await expect(service.consume(PHONE, "PHONE_VERIFY", code)).rejects.toBeInstanceOf(
      DomainException,
    );
  });

  it("hands back the row's refId so the caller knows what was confirmed", async () => {
    const { service } = await build();
    const { code } = await service.issue(PHONE, "WORK_PROOF_CONFIRM", "proof_1");
    await expect(service.consume(PHONE, "WORK_PROOF_CONFIRM", code)).resolves.toEqual({
      refId: "proof_1",
    });
  });

  it("burns the row after five wrong guesses", async () => {
    const { service, prisma } = await build();
    const { code } = await service.issue(PHONE, "PHONE_VERIFY");
    const wrong = code === "000000" ? "111111" : "000000";

    for (let i = 0; i < OTP_LIMITS.MAX_CONFIRM_ATTEMPTS; i += 1) {
      await expect(service.consume(PHONE, "PHONE_VERIFY", wrong)).rejects.toBeInstanceOf(
        DomainException,
      );
    }
    // Burnt, not merely rejected: the correct code no longer works either, so
    // an attacker cannot keep guessing against the same secret.
    await expect(service.consume(PHONE, "PHONE_VERIFY", code)).rejects.toBeInstanceOf(
      DomainException,
    );
    expect(prisma.store.every((r) => r.consumedAt !== null)).toBe(true);
  });

  it("refuses an expired code", async () => {
    const { service, prisma } = await build();
    const { code } = await service.issue(PHONE, "PHONE_VERIFY");
    const row = prisma.store.at(-1);
    if (row) row.expiresAt = new Date(Date.now() - 1000);
    await expect(service.consume(PHONE, "PHONE_VERIFY", code)).rejects.toMatchObject({
      code: "OTP_EXPIRED",
    });
  });

  it("does not let a code cross purposes", async () => {
    // A code sent to confirm a work proof must not verify a phone, or the
    // cheapest attack is to file a proof against your own number.
    const { service } = await build();
    const { code } = await service.issue(PHONE, "WORK_PROOF_CONFIRM", "proof_1");
    await expect(service.consume(PHONE, "PHONE_VERIFY", code)).rejects.toBeInstanceOf(
      DomainException,
    );
  });

  it("caps codes per number per day, not only per session", async () => {
    // The per-user hourly cap is the route's rate-limit bucket. This is the
    // axis a rotating set of accounts would otherwise walk around, and every
    // SMS costs money whether or not it is fraud.
    const { service } = await build();
    for (let i = 0; i < OTP_LIMITS.START_PER_DAY_PER_PHONE; i += 1) {
      await service.issue(PHONE, "PHONE_VERIFY");
    }
    await expect(service.issue(PHONE, "PHONE_VERIFY")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });

  it("sweeps only long-expired rows", async () => {
    const { service, prisma } = await build();
    await service.issue(PHONE, "PHONE_VERIFY");
    expect(await service.sweep()).toBe(0);

    const row = prisma.store.at(-1);
    if (row) row.expiresAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    expect(await service.sweep()).toBe(1);
    expect(prisma.store).toHaveLength(0);
  });
});

describe("hashPhone", () => {
  it("is stable and does not return the number", () => {
    expect(hashPhone(PHONE)).toBe(hashPhone(PHONE));
    expect(hashPhone(PHONE)).not.toContain("599123456");
    expect(hashPhone(PHONE)).not.toBe(hashPhone("+970599123457"));
  });
});
