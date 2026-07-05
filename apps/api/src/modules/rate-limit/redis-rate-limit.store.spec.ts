import { RedisRateLimitStore } from "./rate-limit.store";

describe("RedisRateLimitStore", () => {
  it("allows under the limit and blocks over it", async () => {
    const evalMock = jest
      .fn()
      .mockResolvedValueOnce([1, 60_000])
      .mockResolvedValueOnce([3, 42_000]);
    const store = new RedisRateLimitStore({ eval: evalMock } as never);

    const first = await store.hit("k", 2, 60_000);
    expect(first.allowed).toBe(true);

    const third = await store.hit("k", 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.resetAt).toBeGreaterThan(Date.now());
    expect(evalMock).toHaveBeenCalledWith(expect.any(String), 1, "rl:k", "60000");
  });

  it("fails open when Redis errors", async () => {
    const store = new RedisRateLimitStore({
      eval: jest.fn().mockRejectedValue(new Error("down")),
    } as never);

    const result = await store.hit("k", 1, 1_000);
    expect(result.allowed).toBe(true);
  });
});
