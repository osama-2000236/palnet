import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { StandingService } from "./standing.service";

/**
 * The pure ladder is tested in @baydar/shared. What is testable only here is
 * the gathering: which rows count, how counterparties are deduplicated across
 * three different columns, and what the span actually measures.
 *
 * Those are where a rung gets awarded to somebody who did not earn it.
 */
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

interface Proof {
  confirmedAt: Date | null;
  clientUserId: string | null;
  clientCompanyId: string | null;
  clientPhoneHash: string | null;
}

function buildPrisma(options: {
  proofs?: Proof[];
  standing?: { id: string; value: number; suspendedAt: Date | null } | null;
  vouches?: string[];
  masters?: number;
  bodyRecommendations?: number;
}) {
  const created: unknown[] = [];
  const updated: unknown[] = [];
  return {
    created,
    updated,
    workProof: { findMany: jest.fn(() => Promise.resolve(options.proofs ?? [])) },
    standing: {
      findUnique: jest.fn(() => Promise.resolve(options.standing ?? null)),
      findFirst: jest.fn(() => Promise.resolve(null)),
      count: jest.fn(() => Promise.resolve(options.masters ?? 0)),
      create: jest.fn((args: unknown) => {
        created.push(args);
        return Promise.resolve({});
      }),
      update: jest.fn((args: unknown) => {
        updated.push(args);
        return Promise.resolve({});
      }),
    },
    vouch: {
      findMany: jest.fn(() =>
        Promise.resolve((options.vouches ?? []).map((voucherId) => ({ voucherId }))),
      ),
    },
    recommendation: {
      count: jest.fn(() => Promise.resolve(options.bodyRecommendations ?? 0)),
    },
    licence: { findFirst: jest.fn(() => Promise.resolve(null)) },
    verification: { findMany: jest.fn(() => Promise.resolve([])) },
    userRating: { aggregate: jest.fn(() => Promise.resolve({ _avg: { score: null }, _count: 0 })) },
    profile: { updateMany: jest.fn(() => Promise.resolve({ count: 1 })) },
  };
}

async function build(options: Parameters<typeof buildPrisma>[0]) {
  const prisma = buildPrisma(options);
  const moduleRef = await Test.createTestingModule({
    providers: [StandingService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return { service: moduleRef.get(StandingService), prisma };
}

const proof = (over: Partial<Proof> = {}): Proof => ({
  confirmedAt: ago(1),
  clientUserId: null,
  clientCompanyId: null,
  clientPhoneHash: null,
  ...over,
});

describe("StandingService.recompute", () => {
  it("gives a claim with no evidence rung 1", async () => {
    const { service, prisma } = await build({ proofs: [] });
    expect(await service.recompute("u1", "carpenter")).toBe(1);
    expect(prisma.created).toHaveLength(1);
  });

  it("counts one client's several jobs as one relationship", async () => {
    // Three proofs, one counterparty: rung 2 needs two counterparties, so this
    // is still rung 1. Collapsing this is the easiest way to fake a ladder.
    const { service } = await build({
      proofs: [
        proof({ clientUserId: "c1" }),
        proof({ clientUserId: "c1" }),
        proof({ clientUserId: "c1" }),
      ],
    });
    expect(await service.recompute("u1", "carpenter")).toBe(1);
  });

  it("counts a user, a company and a phone as three different clients", async () => {
    const { service } = await build({
      proofs: [
        proof({ clientUserId: "c1" }),
        proof({ clientCompanyId: "co1" }),
        proof({ clientPhoneHash: "hash1" }),
      ],
    });
    expect(await service.recompute("u1", "carpenter")).toBe(2);
  });

  it("measures span between the first and last confirmation", async () => {
    // Rung 3 wants ten proofs, five clients and 180 days. This has all three
    // only because of the old proof at the bottom.
    const proofs = Array.from({ length: 10 }, (_, i) =>
      proof({ clientUserId: `c${i % 5}`, confirmedAt: ago(i === 0 ? 200 : 1) }),
    );
    const { service } = await build({ proofs });
    expect(await service.recompute("u1", "carpenter")).toBe(3);

    const burst = proofs.map((p) => ({ ...p, confirmedAt: ago(1) }));
    const { service: fast } = await build({ proofs: burst });
    expect(await fast.recompute("u1", "carpenter")).toBe(2);
  });

  it("needs two ACTIVE masters for rung 4, checked now rather than when vouched", async () => {
    const proofs = Array.from({ length: 25 }, (_, i) =>
      proof({ clientUserId: `c${i % 12}`, confirmedAt: ago(i === 0 ? 600 : 1) }),
    );
    const { service: unsponsored } = await build({ proofs, vouches: ["m1", "m2"], masters: 0 });
    expect(await unsponsored.recompute("u1", "carpenter")).toBe(3);

    const { service: sponsored } = await build({ proofs, vouches: ["m1", "m2"], masters: 2 });
    expect(await sponsored.recompute("u1", "carpenter")).toBe(4);
  });

  it("takes a body-verified recommendation instead of two masters", async () => {
    const proofs = Array.from({ length: 25 }, (_, i) =>
      proof({ clientUserId: `c${i % 12}`, confirmedAt: ago(i === 0 ? 600 : 1) }),
    );
    const { service } = await build({ proofs, bodyRecommendations: 1 });
    expect(await service.recompute("u1", "carpenter")).toBe(4);
  });

  it("writes only on a transition, so the notification has a real diff", async () => {
    const { service, prisma } = await build({
      proofs: [],
      standing: { id: "s1", value: 1, suspendedAt: null },
    });
    await service.recompute("u1", "carpenter");
    expect(prisma.updated).toHaveLength(0);
    expect(prisma.created).toHaveLength(0);
  });

  it("does not recompute a suspended standing back up", async () => {
    // Suspension is a decision a human made about a report. Evidence arriving
    // afterwards does not overturn it — reinstatement is its own action.
    const proofs = [
      proof({ clientUserId: "c1" }),
      proof({ clientUserId: "c2" }),
      proof({ clientUserId: "c3" }),
    ];
    const { service, prisma } = await build({
      proofs,
      standing: { id: "s1", value: 1, suspendedAt: ago(3) },
    });
    expect(await service.recompute("u1", "carpenter")).toBe(1);
    expect(prisma.updated).toHaveLength(0);
  });

  it("follows the evidence down as well as up", async () => {
    const { service, prisma } = await build({
      proofs: [],
      standing: { id: "s1", value: 3, suspendedAt: null },
    });
    expect(await service.recompute("u1", "carpenter")).toBe(1);
    expect(prisma.updated).toEqual([
      { where: { id: "s1" }, data: { value: 1, reason: "DEMOTED" } },
    ]);
  });
});

describe("StandingService.recomputeScore", () => {
  it("caches zero for a profile that has shown nothing", async () => {
    const { service, prisma } = await build({ proofs: [] });
    expect(await service.recomputeScore("u1")).toBe(0);
    expect(prisma.profile.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      data: { evidenceScore: 0 },
    });
  });

  it("scores confirmed work and its distinct clients", async () => {
    // 6 proofs = 30, 4 clients = 20. Nothing else set.
    const proofs = Array.from({ length: 6 }, (_, i) => proof({ clientUserId: `c${i % 4}` }));
    const { service } = await build({ proofs });
    expect(await service.recomputeScore("u1")).toBe(50);
  });
});
