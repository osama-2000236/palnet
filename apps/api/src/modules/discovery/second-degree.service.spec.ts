import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { SecondDegreeService } from "./second-degree.service";

/**
 * The nightly refresh, on a six-node graph.
 *
 * a—b, b—c, c—d, a—e, b—e. Small enough to reason about by hand, large enough
 * to have a triangle (a, b, e), a chain (a→b→c→d) and an isolated node (f).
 */
const EDGES = [
  { requesterId: "a", receiverId: "b" },
  { requesterId: "b", receiverId: "c" },
  { requesterId: "c", receiverId: "d" },
  { requesterId: "a", receiverId: "e" },
  { requesterId: "b", receiverId: "e" },
];

type Written = Array<{ userId: string; peerId: string; mutuals: number }>;

function build(edges = EDGES) {
  const written: Written = [];
  const tx = {
    secondDegree: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn((args: { data: Written }) => {
        written.push(...args.data);
        return Promise.resolve({ count: args.data.length });
      }),
    },
  };
  const prisma = {
    connection: { findMany: jest.fn().mockResolvedValue(edges) },
    $transaction: jest.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, tx, written };
}

async function serviceWith(prisma: unknown) {
  const moduleRef = await Test.createTestingModule({
    providers: [SecondDegreeService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return moduleRef.get(SecondDegreeService);
}

const pairOf = (written: Written, userId: string, peerId: string) =>
  written.find((row) => row.userId === userId && row.peerId === peerId);

describe("the second-degree refresh", () => {
  it("finds people two hops away, and counts the paths", async () => {
    const { prisma, written } = build();
    await (await serviceWith(prisma)).refresh();

    // a's neighbours are b and e. c is reachable through b only — e is not
    // connected to c — so one shared connection, not two.
    expect(pairOf(written, "a", "c")).toMatchObject({ mutuals: 1 });
    // d is three hops from a and must not appear at all.
    expect(pairOf(written, "a", "d")).toBeUndefined();
    // b reaches d through c alone.
    expect(pairOf(written, "b", "d")).toMatchObject({ mutuals: 1 });
    // e reaches c through b, the one connection e and c share.
    expect(pairOf(written, "e", "c")).toMatchObject({ mutuals: 1 });
  });

  it("never lists a first-degree connection as second", async () => {
    // a and b are connected and also share e. Counting them as second degree
    // would badge somebody you connected with an hour ago as "2nd".
    const { prisma, written } = build();
    await (await serviceWith(prisma)).refresh();

    expect(pairOf(written, "a", "b")).toBeUndefined();
    expect(pairOf(written, "b", "a")).toBeUndefined();
  });

  it("never lists somebody as their own peer", async () => {
    const { prisma, written } = build();
    await (await serviceWith(prisma)).refresh();

    expect(written.filter((row) => row.userId === row.peerId)).toEqual([]);
  });

  it("is symmetric", async () => {
    const { prisma, written } = build();
    await (await serviceWith(prisma)).refresh();

    for (const row of written) {
      expect(pairOf(written, row.peerId, row.userId)).toMatchObject({ mutuals: row.mutuals });
    }
  });

  it("replaces the table rather than adding to it", async () => {
    // A member who disconnected has to disappear, and there is no delete event
    // to hang that on — so the refresh clears first, every time.
    const { prisma, tx } = build();
    await (await serviceWith(prisma)).refresh();

    expect(tx.secondDegree.deleteMany).toHaveBeenCalledWith({});
  });

  it("produces the same rows when run twice", async () => {
    const first = build();
    await (await serviceWith(first.prisma)).refresh();
    const second = build();
    await (await serviceWith(second.prisma)).refresh();

    // Compared without `refreshedAt`, which is the run's own timestamp and is
    // supposed to differ — everything else must not.
    const shape = (rows: Written) =>
      [...rows]
        .map(({ userId, peerId, mutuals }) => ({ userId, peerId, mutuals }))
        .sort((a, b) => `${a.userId}${a.peerId}`.localeCompare(`${b.userId}${b.peerId}`));
    expect(shape(second.written)).toEqual(shape(first.written));
  });

  it("drops a disconnected member's rows on the next run", async () => {
    // c and d leave the graph. Nothing tells the table; the rebuild is what
    // does, which is exactly why it is a rebuild.
    const { prisma, written } = build([
      { requesterId: "a", receiverId: "b" },
      { requesterId: "a", receiverId: "e" },
      { requesterId: "b", receiverId: "e" },
    ]);
    await (await serviceWith(prisma)).refresh();

    expect(written.some((row) => row.userId === "c" || row.peerId === "c")).toBe(false);
    // Everyone in the triangle is first-degree to everyone else, so nothing
    // is second degree at all.
    expect(written).toEqual([]);
  });

  it("writes nothing on a dry run, and still reports what it would have", async () => {
    const { prisma, tx, written } = build();
    const report = await (await serviceWith(prisma)).refresh({ dryRun: true });

    expect(tx.secondDegree.deleteMany).not.toHaveBeenCalled();
    expect(written).toEqual([]);
    expect(report).toMatchObject({ dryRun: true, users: 5 });
    expect(report.pairs).toBeGreaterThan(0);
  });
});
