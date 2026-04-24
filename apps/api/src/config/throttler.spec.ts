import { RedisThrottlerStorage } from "./redis-throttler-storage";
import { createThrottlerOptions, DEFAULT_THROTTLER } from "./throttler";

describe("createThrottlerOptions", () => {
  it("uses in-memory throttling when REDIS_URL is absent", () => {
    expect(createThrottlerOptions({ REDIS_URL: undefined })).toEqual([DEFAULT_THROTTLER]);
  });

  it("uses Redis storage when REDIS_URL is present", () => {
    const options = createThrottlerOptions({
      REDIS_URL: "redis://localhost:6379",
    });

    expect(options).toEqual(
      expect.objectContaining({
        throttlers: [DEFAULT_THROTTLER],
        storage: expect.any(RedisThrottlerStorage),
      }),
    );
  });
});
