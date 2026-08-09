import type { FollowWriter } from "./connection-follows";
import { addMutualFollows, removeMutualFollows } from "./connection-follows";

/**
 * A connection is two follows, and the counter has to agree with them.
 *
 * The case that matters is the ordinary one: somebody found you, followed you,
 * and then asked to connect. Accepting must not count that follow a second
 * time, and the naive version — one `createMany` for both rows, then bump both
 * counters — does exactly that.
 */
function writer(existing: Array<{ followerId: string; targetKey: string }> = []) {
  const rows = [...existing];
  const bumps: string[] = [];
  const drops: string[] = [];

  const tx = {
    follow: {
      createMany: jest.fn((args: { data: Array<{ followerId: string; targetKey: string }> }) => {
        let count = 0;
        for (const row of args.data) {
          const clash = rows.some(
            (r) => r.followerId === row.followerId && r.targetKey === row.targetKey,
          );
          if (clash) continue;
          rows.push({ followerId: row.followerId, targetKey: row.targetKey });
          count += 1;
        }
        return Promise.resolve({ count });
      }),
      deleteMany: jest.fn((args: { where: { followerId: string; targetKey: string } }) => {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i -= 1) {
          const row = rows[i]!;
          if (row.followerId === args.where.followerId && row.targetKey === args.where.targetKey) {
            rows.splice(i, 1);
          }
        }
        return Promise.resolve({ count: before - rows.length });
      }),
    },
    followerCount: {
      upsert: jest.fn((args: { where: { targetKey: string } }) => {
        bumps.push(args.where.targetKey);
        return Promise.resolve({});
      }),
      updateMany: jest.fn((args: { where: { targetKey: string } }) => {
        drops.push(args.where.targetKey);
        return Promise.resolve({ count: 1 });
      }),
    },
  };

  return { tx: tx as unknown as FollowWriter, rows, bumps, drops };
}

describe("accepting a connection", () => {
  it("follows both ways and counts both", async () => {
    const { tx, rows, bumps } = writer();

    await addMutualFollows(tx, "a", "b");

    expect(rows).toEqual([
      { followerId: "a", targetKey: "USER:b" },
      { followerId: "b", targetKey: "USER:a" },
    ]);
    expect(bumps).toEqual(["USER:b", "USER:a"]);
  });

  it("does not double-count a follow that already existed", async () => {
    // b followed a first and then asked to connect — a very ordinary order of
    // events, and the one a single batched `createMany` gets wrong.
    const { tx, rows, bumps } = writer([{ followerId: "b", targetKey: "USER:a" }]);

    await addMutualFollows(tx, "a", "b");

    expect(rows).toHaveLength(2);
    expect(bumps).toEqual(["USER:b"]);
  });

  it("counts nothing when both follows already existed", async () => {
    const { tx, bumps } = writer([
      { followerId: "a", targetKey: "USER:b" },
      { followerId: "b", targetKey: "USER:a" },
    ]);

    await addMutualFollows(tx, "a", "b");

    expect(bumps).toEqual([]);
  });
});

describe("disconnecting", () => {
  it("removes both follows and decrements both counters", async () => {
    const { tx, rows, drops } = writer([
      { followerId: "a", targetKey: "USER:b" },
      { followerId: "b", targetKey: "USER:a" },
    ]);

    await removeMutualFollows(tx, "a", "b");

    expect(rows).toEqual([]);
    expect(drops).toEqual(["USER:b", "USER:a"]);
  });

  it("decrements nothing for a follow that was not there", async () => {
    // Only one direction survived — somebody unfollowed and stayed connected,
    // which is allowed. The counter must not go down twice for one row.
    const { tx, drops } = writer([{ followerId: "a", targetKey: "USER:b" }]);

    await removeMutualFollows(tx, "a", "b");

    expect(drops).toEqual(["USER:b"]);
  });

  it("guards the decrement so a drifted counter cannot go negative", async () => {
    const { tx } = writer([{ followerId: "a", targetKey: "USER:b" }]);

    await removeMutualFollows(tx, "a", "b");

    // The table has CHECK (count >= 0); an unguarded decrement would make
    // drift a user-facing 500 on disconnect rather than a job's problem.
    const call = (tx.followerCount.updateMany as jest.Mock).mock.calls[0]![0] as {
      where: { count: { gt: number } };
    };
    expect(call.where.count).toEqual({ gt: 0 });
  });
});
