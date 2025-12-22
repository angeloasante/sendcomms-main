import { Redis } from '@upstash/redis';

// Lazy-initialized Redis client
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

// Export for backwards compatibility
export const redis = {
  get: async <T>(key: string) => getRedis().get<T>(key),
  set: async <T>(key: string, value: T, options?: { ex: number }) => {
    if (options?.ex) {
      return getRedis().set(key, value, { ex: options.ex });
    }
    return getRedis().set(key, value);
  },
  del: async (key: string) => getRedis().del(key),
  incr: async (key: string) => getRedis().incr(key),
  expire: async (key: string, seconds: number) => getRedis().expire(key, seconds),
  zremrangebyscore: async (key: string, min: number, max: number) => getRedis().zremrangebyscore(key, min, max),
  zcard: async (key: string) => getRedis().zcard(key),
  zrange: async (key: string, start: number, stop: number, options?: { withScores?: boolean }) => getRedis().zrange(key, start, stop, options as { withScores: true }),
  zadd: async (key: string, data: { score: number; member: string }) => getRedis().zadd(key, data),
  lpush: async (key: string, value: string) => getRedis().lpush(key, value),
  rpop: async (key: string) => getRedis().rpop(key),
};

// Rate limiting
export async function rateLimit(
  key: string,
  limit: number,
  window: number // in seconds
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowStart = now - window * 1000;

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count current requests
  const count = await redis.zcard(key);

  if (count >= limit) {
    const oldestEntry = await redis.zrange(key, 0, 0, { withScores: true });
    const reset = oldestEntry.length > 0 ? Math.ceil((Number(oldestEntry[1]) + window * 1000 - now) / 1000) : window;
    
    return {
      success: false,
      remaining: 0,
      reset,
    };
  }

  // Add current request
  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  await redis.expire(key, window);

  return {
    success: true,
    remaining: limit - count - 1,
    reset: window,
  };
}

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  return redis.get(key);
}

export async function setCache<T>(key: string, value: T, ttl?: number): Promise<void> {
  if (ttl) {
    await redis.set(key, value, { ex: ttl });
  } else {
    await redis.set(key, value);
  }
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

// Queue helpers for webhook retries
export async function enqueueWebhook(webhookData: {
  url: string;
  payload: unknown;
  retries: number;
}): Promise<void> {
  await redis.lpush('webhook_queue', JSON.stringify(webhookData));
}

export async function dequeueWebhook(): Promise<{
  url: string;
  payload: unknown;
  retries: number;
} | null> {
  const data = await redis.rpop('webhook_queue');
  return data ? JSON.parse(data as string) : null;
}
