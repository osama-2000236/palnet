import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { SMS_TRANSPORT } from "../sms/sms.transport";
import { OtpService, hashPhone } from "../verifications/otp.service";

import { StandingService } from "./standing.service";
import { WorkProofsService } from "./work-proofs.service";

/**
 * Every shortcut around the evidence loop, tried on purpose.
 *
 * The loop is the only thing standing between a declared trade and an earned
 * one, so the interesting tests are the attacks: confirm your own work, confirm
 * somebody else's, reuse an SMS code meant for a different proof.
 */
const PHONE = "+970599123456";

const proofRow = (over: Record<string, unknown> = {}) => ({
  id: "wp_1",
  workerId: "worker",
  clientUserId: "client",
  clientCompanyId: null,
  clientPhoneHash: null,
  occupationKey: "carpenter",
  jobId: null,
  applicationId: null,
  city: null,
  summary: null,
  status: "PENDING",
  completedAt: new Date(),
  confirmExpiresAt: new Date(Date.now() + 60_000),
  confirmedAt: null,
  createdAt: new Date(),
  clientUser: null,
  clientCompany: null,
  ...over,
});

async function build(
  options: {
    row?: Record<string, unknown> | null;
    phoneVerified?: boolean;
    otpRefId?: string | null;
    companyAdmins?: number;
  } = {},
) {
  const created: unknown[] = [];
  const sent: Array<{ to: string; body: string }> = [];

  const prisma = {
    workProof: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return Promise.resolve(proofRow(data));
      }),
      findUnique: jest.fn(() =>
        Promise.resolve(options.row === undefined ? proofRow() : options.row),
      ),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(proofRow({ ...(options.row ?? {}), ...data })),
      ),
      findMany: jest.fn(() => Promise.resolve([])),
      updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
    },
    user: {
      findUnique: jest.fn(() =>
        Promise.resolve({ phoneVerifiedAt: options.phoneVerified ? new Date() : null }),
      ),
    },
    companyMember: { count: jest.fn(() => Promise.resolve(options.companyAdmins ?? 0)) },
    phoneOtp: {
      findFirst: jest.fn(() => Promise.resolve({ phoneE164: PHONE })),
    },
  };

  const otp = {
    issue: jest.fn(() =>
      Promise.resolve({ code: "123456", expiresAt: new Date(), resendAfter: new Date() }),
    ),
    consume: jest.fn(() =>
      Promise.resolve({ refId: options.otpRefId === undefined ? "wp_1" : options.otpRefId }),
    ),
  };
  const standing = { recompute: jest.fn(), recomputeScore: jest.fn() };
  const sms = {
    send: jest.fn((to: string, body: string) => {
      sent.push({ to, body });
      return Promise.resolve();
    }),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      WorkProofsService,
      { provide: PrismaService, useValue: prisma },
      { provide: StandingService, useValue: standing },
      { provide: OtpService, useValue: otp },
      { provide: SMS_TRANSPORT, useValue: sms },
    ],
  }).compile();

  return { service: moduleRef.get(WorkProofsService), prisma, otp, standing, created, sent };
}

const body = {
  occupationKey: "carpenter",
  completedAt: new Date().toISOString(),
};

describe("filing a work proof", () => {
  it("refuses a worker naming themselves as the client", async () => {
    // The first thing anybody tries, and the one that would make the whole
    // ladder self-service.
    const { service } = await build();
    await expect(
      service.create("worker", { ...body, clientUserId: "worker" }),
    ).rejects.toMatchObject({ code: "WORK_PROOF_SELF_CONFIRM" });
  });

  it("stores the client's number as a hash, never as a number", async () => {
    const { service, created, sent } = await build({ phoneVerified: true });
    await service.create("worker", { ...body, clientPhoneE164: PHONE });

    const data = created[0] as Record<string, unknown>;
    expect(data.clientPhoneHash).toBe(hashPhone(PHONE));
    expect(JSON.stringify(data)).not.toContain("599123456");
    // The code still has to reach a real phone, so the transport sees it once.
    expect(sent[0]?.to).toBe(PHONE);
  });

  it("makes a worker verify their own phone before naming somebody else's", async () => {
    // Otherwise the off-platform path is a free SMS gun pointed at any number,
    // paid for by Baydar and attributable to nobody.
    const { service } = await build({ phoneVerified: false });
    await expect(
      service.create("worker", { ...body, clientPhoneE164: PHONE }),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe("confirming a work proof", () => {
  it("lets the named client confirm, and moves both cached numbers", async () => {
    const { service, standing } = await build();
    const result = await service.confirm("wp_1", {}, "client");
    expect(result.status).toBe("CONFIRMED");
    expect(standing.recompute).toHaveBeenCalledWith("worker", "carpenter");
    expect(standing.recomputeScore).toHaveBeenCalledWith("worker");
  });

  it("refuses a stranger, and says 404 rather than 403", async () => {
    // Whether a proof exists is not something somebody gets to learn by
    // guessing ids.
    const { service } = await build();
    await expect(service.confirm("wp_1", {}, "stranger")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("refuses the worker confirming their own filing", async () => {
    const { service } = await build();
    await expect(service.confirm("wp_1", {}, "worker")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lets a company admin confirm on the company's behalf", async () => {
    const { service } = await build({
      row: proofRow({ clientUserId: null, clientCompanyId: "co_1" }),
      companyAdmins: 1,
    });
    await expect(service.confirm("wp_1", {}, "admin")).resolves.toMatchObject({
      status: "CONFIRMED",
    });
  });

  it("requires a code on the off-platform path", async () => {
    const { service } = await build({
      row: proofRow({ clientUserId: null, clientPhoneHash: "h" }),
    });
    await expect(service.confirm("wp_1", {}, null)).rejects.toMatchObject({ code: "OTP_INVALID" });
  });

  it("refuses a valid code minted for a different proof", async () => {
    // The code is the authorisation on this path, so it has to be bound to the
    // row it was sent about — otherwise one confirmation confirms everything.
    const { service } = await build({
      row: proofRow({ clientUserId: null, clientPhoneHash: "h" }),
      otpRefId: "wp_OTHER",
    });
    await expect(service.confirm("wp_1", { code: "123456" }, null)).rejects.toMatchObject({
      code: "OTP_INVALID",
    });
  });

  it("refuses to confirm something that is no longer pending", async () => {
    const { service } = await build({ row: proofRow({ status: "CONFIRMED" }) });
    await expect(service.confirm("wp_1", {}, "client")).rejects.toMatchObject({
      code: "WORK_PROOF_NOT_PENDING",
    });
  });

  it("refuses a request whose window has closed", async () => {
    const { service } = await build({
      row: proofRow({ confirmExpiresAt: new Date(Date.now() - 1000) }),
    });
    await expect(service.confirm("wp_1", {}, "client")).rejects.toMatchObject({
      code: "WORK_PROOF_NOT_PENDING",
    });
  });
});

describe("disputing a work proof", () => {
  it("marks it DISPUTED and recomputes, rather than deleting it", async () => {
    // Deletion would let either party erase the record in an argument about
    // the last invoice, and the record is the point.
    const { service, standing, prisma } = await build({ row: proofRow({ status: "CONFIRMED" }) });
    const result = await service.dispute("wp_1", "client", { reason: "Never happened at all." });
    expect(result.status).toBe("DISPUTED");
    expect(prisma.workProof.update).toHaveBeenCalled();
    expect(standing.recompute).toHaveBeenCalledWith("worker", "carpenter");
  });

  it("is open to both parties and nobody else", async () => {
    const { service } = await build({ row: proofRow({ status: "CONFIRMED" }) });
    await expect(
      service.dispute("wp_1", "worker", { reason: "They never paid me." }),
    ).resolves.toBeTruthy();
    await expect(
      service.dispute("wp_1", "stranger", { reason: "I disagree with this." }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
