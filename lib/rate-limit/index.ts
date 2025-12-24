import { Redis } from '@upstash/redis';

// Lazy initialization to handle build time
let redisClient: Redis | null = null;

const getRedis = () => {
  if (!redisClient) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis environment variables are not configured');
    }
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });
  }
  return redisClient;
};

// Rate limit tiers - ALIGNED WITH LANDING PAGE PRICING
// Free: $0/mo, Starter: $29/mo, Pro: $99/mo, Business: $299/mo, Enterprise: Custom
export const RATE_LIMITS = {
  free: {
    perMinute: 10,
    perHour: 100,
    perDay: 1000,
    perMonth: 10000
  },
  starter: {
    perMinute: 100,
    perHour: 1000,
    perDay: 10000,
    perMonth: 100000
  },
  pro: {
    perMinute: 500,
    perHour: 5000,
    perDay: 50000,
    perMonth: 500000
  },
  business: {
    perMinute: 1000,
    perHour: 10000,
    perDay: 100000,
    perMonth: 1000000
  },
  enterprise: {
    perMinute: 10000,
    perHour: 100000,
    perDay: 1000000,
    perMonth: 10000000
  }
} as const;

// Service-specific limits - ALIGNED WITH LANDING PAGE PRICING
// Free: 50 SMS, 500 emails, 1GB data, GHS 10 airtime
// Starter: 300 SMS, 2,000 emails, 5GB data, GHS 30 airtime
// Pro: 1,500 SMS, 10,000 emails, 30GB data, GHS 150 airtime
// Business: 6,000 SMS, 40,000 emails, 150GB data, GHS 600 airtime
// Enterprise: Custom
export const SERVICE_LIMITS = {
  sms: {
    free: { perMinute: 5, perDay: 50, perMonth: 50 },
    starter: { perMinute: 50, perDay: 300, perMonth: 300 },
    pro: { perMinute: 200, perDay: 1500, perMonth: 1500 },
    business: { perMinute: 500, perDay: 6000, perMonth: 6000 },
    enterprise: { perMinute: 5000, perDay: 100000, perMonth: 1000000 }
  },
  email: {
    free: { perMinute: 10, perDay: 500, perMonth: 500 },
    starter: { perMinute: 100, perDay: 2000, perMonth: 2000 },
    pro: { perMinute: 500, perDay: 10000, perMonth: 10000 },
    business: { perMinute: 1000, perDay: 40000, perMonth: 40000 },
    enterprise: { perMinute: 10000, perDay: 500000, perMonth: 10000000 }
  },
  airtime: {
    free: { perMinute: 2, perDay: 50, perMonth: 50 },
    starter: { perMinute: 20, perDay: 300, perMonth: 300 },
    pro: { perMinute: 100, perDay: 1500, perMonth: 1500 },
    business: { perMinute: 200, perDay: 6000, perMonth: 6000 },
    enterprise: { perMinute: 2000, perDay: 50000, perMonth: 500000 }
  },
  data: {
    free: { perMinute: 2, perDay: 50, perMonth: 50 },
    starter: { perMinute: 20, perDay: 300, perMonth: 300 },
    pro: { perMinute: 100, perDay: 1500, perMonth: 1500 },
    business: { perMinute: 200, perDay: 6000, perMonth: 6000 },
    enterprise: { perMinute: 2000, perDay: 50000, perMonth: 500000 }
  }
} as const;

// Plan monthly limits (for usage tracking)
export const PLAN_MONTHLY_LIMITS = {
  free: { sms: 50, email: 500, dataGb: 1, airtimeGhs: 10 },
  starter: { sms: 300, email: 2000, dataGb: 5, airtimeGhs: 30 },
  pro: { sms: 1500, email: 10000, dataGb: 30, airtimeGhs: 150 },
  business: { sms: 6000, email: 40000, dataGb: 150, airtimeGhs: 600 },
  enterprise: { sms: Infinity, email: Infinity, dataGb: Infinity, airtimeGhs: Infinity }
} as const;

export type PlanType = keyof typeof RATE_LIMITS;
export type ServiceType = keyof typeof SERVICE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

// Check rate limit
export async function checkRateLimit(
  customerId: string,
  plan: PlanType,
  service?: ServiceType
): Promise<RateLimitResult> {
  
  const now = Date.now();
  
  // If service-specific, check those limits first
  if (service && SERVICE_LIMITS[service]) {
    const serviceLimits = SERVICE_LIMITS[service][plan];
    
    // Check minute limit
    const minuteKey = `ratelimit:${customerId}:${service}:minute:${Math.floor(now / 60000)}`;
    const minuteCount = await getRedis().incr(minuteKey);
    
    if (minuteCount === 1) {
      await getRedis().expire(minuteKey, 60);
    }
    
    if (minuteCount > serviceLimits.perMinute) {
      return {
        allowed: false,
        limit: serviceLimits.perMinute,
        remaining: 0,
        reset: Math.floor(now / 60000) * 60 + 60,
        retryAfter: 60 - (Math.floor(now / 1000) % 60)
      };
    }
    
    // Check day limit
    const dayKey = `ratelimit:${customerId}:${service}:day:${Math.floor(now / 86400000)}`;
    const dayCount = await getRedis().incr(dayKey);
    
    if (dayCount === 1) {
      await getRedis().expire(dayKey, 86400);
    }
    
    if (dayCount > serviceLimits.perDay) {
      return {
        allowed: false,
        limit: serviceLimits.perDay,
        remaining: 0,
        reset: Math.floor(now / 86400000) * 86400 + 86400,
        retryAfter: 86400 - (Math.floor(now / 1000) % 86400)
      };
    }
    
    return {
      allowed: true,
      limit: serviceLimits.perMinute,
      remaining: serviceLimits.perMinute - minuteCount,
      reset: Math.floor(now / 60000) * 60 + 60
    };
  }
  
  // Check global limits
  const limits = RATE_LIMITS[plan];
  const windows = ['minute', 'hour', 'day', 'month'] as const;
  
  for (const window of windows) {
    const windowMs: Record<string, number> = {
      minute: 60000,
      hour: 3600000,
      day: 86400000,
      month: 2592000000
    };
    
    const key = `ratelimit:${customerId}:${window}:${Math.floor(now / windowMs[window])}`;
    const count = await getRedis().incr(key);
    
    if (count === 1) {
      await getRedis().expire(key, Math.floor(windowMs[window] / 1000));
    }
    
    const limitKey = `per${window.charAt(0).toUpperCase() + window.slice(1)}` as keyof typeof limits;
    const limit = limits[limitKey];
    
    if (count > limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        reset: Math.floor(now / windowMs[window]) * windowMs[window] + windowMs[window],
        retryAfter: Math.floor((Math.floor(now / windowMs[window]) * windowMs[window] + windowMs[window] - now) / 1000)
      };
    }
  }
  
  // All checks passed
  const minuteKey = `ratelimit:${customerId}:minute:${Math.floor(now / 60000)}`;
  const currentMinuteCount = await getRedis().get<number>(minuteKey) || 0;
  
  return {
    allowed: true,
    limit: limits.perMinute,
    remaining: limits.perMinute - currentMinuteCount,
    reset: Math.floor(now / 60000) * 60 + 60
  };
}

// Get current usage
export async function getRateLimitUsage(
  customerId: string,
  plan: PlanType
) {
  const now = Date.now();
  
  const minuteKey = `ratelimit:${customerId}:minute:${Math.floor(now / 60000)}`;
  const hourKey = `ratelimit:${customerId}:hour:${Math.floor(now / 3600000)}`;
  const dayKey = `ratelimit:${customerId}:day:${Math.floor(now / 86400000)}`;
  const monthKey = `ratelimit:${customerId}:month:${Math.floor(now / 2592000000)}`;
  
  const redisClient = getRedis();
  const [minute, hour, day, month] = await Promise.all([
    redisClient.get<number>(minuteKey),
    redisClient.get<number>(hourKey),
    redisClient.get<number>(dayKey),
    redisClient.get<number>(monthKey)
  ]);
  
  const limits = RATE_LIMITS[plan];
  
  return {
    minute: {
      used: minute || 0,
      limit: limits.perMinute,
      remaining: limits.perMinute - (minute || 0)
    },
    hour: {
      used: hour || 0,
      limit: limits.perHour,
      remaining: limits.perHour - (hour || 0)
    },
    day: {
      used: day || 0,
      limit: limits.perDay,
      remaining: limits.perDay - (day || 0)
    },
    month: {
      used: month || 0,
      limit: limits.perMonth,
      remaining: limits.perMonth - (month || 0)
    }
  };
}

// Get service-specific usage
export async function getServiceUsage(
  customerId: string,
  plan: PlanType,
  service: ServiceType
) {
  const now = Date.now();
  const serviceLimits = SERVICE_LIMITS[service][plan];
  
  const minuteKey = `ratelimit:${customerId}:${service}:minute:${Math.floor(now / 60000)}`;
  const dayKey = `ratelimit:${customerId}:${service}:day:${Math.floor(now / 86400000)}`;
  const monthKey = `ratelimit:${customerId}:${service}:month:${Math.floor(now / 2592000000)}`;
  
  const redisClient = getRedis();
  const [minute, day, month] = await Promise.all([
    redisClient.get<number>(minuteKey),
    redisClient.get<number>(dayKey),
    redisClient.get<number>(monthKey)
  ]);
  
  return {
    minute: {
      used: minute || 0,
      limit: serviceLimits.perMinute,
      remaining: serviceLimits.perMinute - (minute || 0)
    },
    day: {
      used: day || 0,
      limit: serviceLimits.perDay,
      remaining: serviceLimits.perDay - (day || 0)
    },
    month: {
      used: month || 0,
      limit: serviceLimits.perMonth,
      remaining: serviceLimits.perMonth - (month || 0)
    }
  };
}

// Reset rate limit (admin only)
export async function resetRateLimit(customerId: string, service?: ServiceType) {
  const now = Date.now();
  const windows = ['minute', 'hour', 'day', 'month'] as const;
  
  const windowMs: Record<string, number> = {
    minute: 60000,
    hour: 3600000,
    day: 86400000,
    month: 2592000000
  };
  
  const keysToDelete: string[] = [];
  
  for (const window of windows) {
    if (service) {
      keysToDelete.push(`ratelimit:${customerId}:${service}:${window}:${Math.floor(now / windowMs[window])}`);
    } else {
      keysToDelete.push(`ratelimit:${customerId}:${window}:${Math.floor(now / windowMs[window])}`);
    }
  }
  
  const redisClient = getRedis();
  await Promise.all(keysToDelete.map(key => redisClient.del(key)));
}
