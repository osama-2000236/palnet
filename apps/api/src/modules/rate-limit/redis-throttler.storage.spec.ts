import { RedisThrottlerStorage } from "./redis-throttler.storage";

describe("RedisThrottlerStorage", () => {
  it("returns hits and expiry in seconds while under the limit", async () => {
    const evalMock = jest.fn().mockResolvedValue([3, 42_000, 0, 0]);
    const storage = new RedisThrottlerStorage({ eval: evalMock } as never);

    const record = await storage.increment("k", 60_000, 5, 0, "default");

    expect(record).toEqual({
      totalHits: 3,
      timeToExpire: 42,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    // blockDuration 0 falls back to ttl, matching the guard's default.
    expect(evalMock).toHaveBeenCalledWith(
      expect.any(String),
      2,
      "thr:default:k",
      "thr:default:k:block",
      "60000",
      "5",
      "60000",
    );
  });

  it("reports blocked with block expiry when over the limit", async () => {
    const evalMock = jest.fn().mockResolvedValue([6, 30_000, 1, 30_000]);
    const storage = new RedisThrottlerStorage({ eval: evalMock } as never);

    const record = await storage.increment("k", 60_000, 5, 0, "default");

    expect(record.isBlocked).toBe(true);
    expect(record.timeToBlockExpire).toBe(30);
  });

  it("fails open when Redis errors", async () => {
    const storage = new RedisThrottlerStorage({
      eval: jest.fn().mockRejectedValue(new Error("down")),
    } as never);

    const record = await storage.increment("k", 60_000, 5, 0, "default");

    expect(record.isBlocked).toBe(false);
    expect(record.totalHits).toBe(1);
  });
});
