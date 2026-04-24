import type { ThrottlerStorage } from "@nestjs/throttler";
import Redis from "ioredis";

type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const namespacedKey = `baydar:throttle:${throttlerName}:${key}`;
    const effectiveBlockDuration = blockDuration > 0 ? blockDuration : ttl;
    const result = await this.redis.eval(
      INCREMENT_SCRIPT,
      1,
      namespacedKey,
      String(ttl),
      String(limit),
      String(effectiveBlockDuration),
    );
    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = parseRedisResult(result);

    return {
      totalHits,
      timeToExpire,
      isBlocked: isBlocked === 1,
      timeToBlockExpire,
    };
  }
}

const INCREMENT_SCRIPT = `
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])
local blockKey = key .. ":block"

if redis.call("EXISTS", blockKey) == 1 then
  return {tonumber(redis.call("GET", key) or "0"), redis.call("PTTL", key), 1, redis.call("PTTL", blockKey)}
end

local total = redis.call("INCR", key)
if total == 1 then
  redis.call("PEXPIRE", key, ttl)
end

local ttlLeft = redis.call("PTTL", key)
if total > limit then
  redis.call("SET", blockKey, "1", "PX", blockDuration)
  return {total, ttlLeft, 1, blockDuration}
end

return {total, ttlLeft, 0, 0}
`;

function parseRedisResult(value: unknown): [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4) {
    return [0, 0, 0, 0];
  }

  return [
    toPositiveNumber(value[0]),
    toPositiveNumber(value[1]),
    toPositiveNumber(value[2]),
    toPositiveNumber(value[3]),
  ];
}

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
