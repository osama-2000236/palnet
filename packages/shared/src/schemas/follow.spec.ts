import { FollowBody, FollowTargetType, followTargetKey } from "./follow";

const USER = "ckuser000000000000000001";
const COMPANY = "ckcomp000000000000000001";

describe("the canonical target key", () => {
  it("names each target type distinctly", () => {
    expect(followTargetKey({ targetType: FollowTargetType.USER, targetUserId: USER })).toBe(
      `USER:${USER}`,
    );
    expect(
      followTargetKey({ targetType: FollowTargetType.COMPANY, targetCompanyId: COMPANY }),
    ).toBe(`COMPANY:${COMPANY}`);
    expect(
      followTargetKey({ targetType: FollowTargetType.TOPIC, targetTopicKey: "carpentry" }),
    ).toBe("TOPIC:carpentry");
  });

  it("cannot collide a user with a company that shares an id", () => {
    // The prefix is not decoration: without it a cuid reused across two tables
    // would merge two follower counts into one.
    expect(followTargetKey({ targetType: FollowTargetType.USER, targetUserId: "x" })).not.toBe(
      followTargetKey({ targetType: FollowTargetType.COMPANY, targetCompanyId: "x" }),
    );
  });

  it("is stable, because the database keys on it", () => {
    const target = { targetType: FollowTargetType.USER, targetUserId: USER };
    expect(followTargetKey(target)).toBe(followTargetKey({ ...target, targetCompanyId: null }));
  });
});

describe("the follow body", () => {
  it("accepts exactly one target", () => {
    expect(FollowBody.safeParse({ targetType: "USER", targetUserId: USER }).success).toBe(true);
    expect(FollowBody.safeParse({ targetType: "TOPIC", targetTopicKey: "carpentry" }).success).toBe(
      true,
    );
  });

  it("rejects two targets", () => {
    // A row with two targets is counted twice by FollowerCount and never
    // uncounted. The database has a CHECK for it; this rejects it earlier,
    // with a message a client can act on.
    expect(
      FollowBody.safeParse({
        targetType: "USER",
        targetUserId: USER,
        targetCompanyId: COMPANY,
      }).success,
    ).toBe(false);
  });

  it("rejects none", () => {
    expect(FollowBody.safeParse({ targetType: "USER" }).success).toBe(false);
  });

  it("rejects a target that does not match its type", () => {
    // Otherwise the key says COMPANY and the foreign key points at a user.
    expect(FollowBody.safeParse({ targetType: "COMPANY", targetUserId: USER }).success).toBe(false);
  });
});
