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

// Idempotency key TTL (24 hours in seconds)
const IDEMPOTENCY_TTL = 86400;

export interface IdempotencyResult<T = unknown> {
  isDuplicate: boolean;
  cachedResponse?: T;
}

export interface StoredIdempotencyResponse {
  response: unknown;
  statusCode: number;
  timestamp: number;
  transactionId?: string;
}

/**
 * Check if an idempotency key has been used before
 * Returns cached response if duplicate, null if new request
 */
export async function checkIdempotency<T = unknown>(
  customerId: string,
  idempotencyKey: string,
  service: 'email' | 'sms' | 'data' | 'airtime'
): Promise<IdempotencyResult<T>> {
  if (!idempotencyKey) {
    return { isDuplicate: false };
  }

  const key = `idempotency:${customerId}:${service}:${idempotencyKey}`;
  
  try {
    const cached = await getRedis().get<StoredIdempotencyResponse>(key);
    
    if (cached) {
      return {
        isDuplicate: true,
        cachedResponse: cached.response as T
      };
    }
    
    return { isDuplicate: false };
  } catch (error) {
    console.error('Idempotency check failed:', error);
    // On error, allow the request to proceed
    return { isDuplicate: false };
  }
}

/**
 * Store the response for an idempotency key
 * Should be called after successful processing
 */
export async function storeIdempotencyResponse(
  customerId: string,
  idempotencyKey: string,
  service: 'email' | 'sms' | 'data' | 'airtime',
  response: unknown,
  statusCode: number = 200,
  transactionId?: string
): Promise<void> {
  if (!idempotencyKey) {
    return;
  }

  const key = `idempotency:${customerId}:${service}:${idempotencyKey}`;
  
  try {
    const stored: StoredIdempotencyResponse = {
      response,
      statusCode,
      timestamp: Date.now(),
      transactionId
    };
    
    await getRedis().setex(key, IDEMPOTENCY_TTL, stored);
  } catch (error) {
    console.error('Failed to store idempotency response:', error);
    // Don't throw - idempotency storage failure shouldn't fail the request
  }
}

/**
 * Acquire a lock for an idempotency key to prevent concurrent duplicate processing
 * Returns true if lock acquired, false if another request is processing
 */
export async function acquireIdempotencyLock(
  customerId: string,
  idempotencyKey: string,
  service: 'email' | 'sms' | 'data' | 'airtime',
  lockTTL: number = 30 // Lock expires after 30 seconds
): Promise<boolean> {
  if (!idempotencyKey) {
    return true;
  }

  const lockKey = `idempotency_lock:${customerId}:${service}:${idempotencyKey}`;
  
  try {
    // NX = only set if not exists
    const result = await getRedis().set(lockKey, Date.now().toString(), {
      nx: true,
      ex: lockTTL
    });
    
    return result === 'OK';
  } catch (error) {
    console.error('Failed to acquire idempotency lock:', error);
    // On error, allow the request to proceed
    return true;
  }
}

/**
 * Release the idempotency lock after processing
 */
export async function releaseIdempotencyLock(
  customerId: string,
  idempotencyKey: string,
  service: 'email' | 'sms' | 'data' | 'airtime'
): Promise<void> {
  if (!idempotencyKey) {
    return;
  }

  const lockKey = `idempotency_lock:${customerId}:${service}:${idempotencyKey}`;
  
  try {
    await getRedis().del(lockKey);
  } catch (error) {
    console.error('Failed to release idempotency lock:', error);
  }
}

/**
 * Full idempotency check with locking
 * - Checks for cached response
 * - Acquires lock if no cache
 * - Returns processing result
 */
export async function handleIdempotency<T = unknown>(
  customerId: string,
  idempotencyKey: string | undefined | null,
  service: 'email' | 'sms' | 'data' | 'airtime'
): Promise<{
  shouldProcess: boolean;
  cachedResponse?: T;
  isLocked?: boolean;
}> {
  if (!idempotencyKey) {
    return { shouldProcess: true };
  }

  // First check cache
  const cacheResult = await checkIdempotency<T>(customerId, idempotencyKey, service);
  
  if (cacheResult.isDuplicate) {
    return {
      shouldProcess: false,
      cachedResponse: cacheResult.cachedResponse
    };
  }

  // Try to acquire lock
  const lockAcquired = await acquireIdempotencyLock(customerId, idempotencyKey, service);
  
  if (!lockAcquired) {
    // Another request is processing - wait a bit and check cache again
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const retryCache = await checkIdempotency<T>(customerId, idempotencyKey, service);
    if (retryCache.isDuplicate) {
      return {
        shouldProcess: false,
        cachedResponse: retryCache.cachedResponse
      };
    }
    
    // Still no cache, but locked - indicate conflict
    return {
      shouldProcess: false,
      isLocked: true
    };
  }

  return { shouldProcess: true };
}

/**
 * Complete the idempotency workflow after processing
 */
export async function completeIdempotency(
  customerId: string,
  idempotencyKey: string | undefined | null,
  service: 'email' | 'sms' | 'data' | 'airtime',
  response: unknown,
  statusCode: number = 200,
  transactionId?: string
): Promise<void> {
  if (!idempotencyKey) {
    return;
  }

  try {
    // Store response
    await storeIdempotencyResponse(
      customerId,
      idempotencyKey,
      service,
      response,
      statusCode,
      transactionId
    );
    
    // Release lock
    await releaseIdempotencyLock(customerId, idempotencyKey, service);
  } catch (error) {
    console.error('Failed to complete idempotency:', error);
    // Always try to release lock
    await releaseIdempotencyLock(customerId, idempotencyKey, service);
  }
}

/**
 * Generate response for cached idempotent request
 */
export function createIdempotentResponse(
  cachedResponse: unknown,
  headers?: Headers
): { body: unknown; headers: Headers } {
  const responseHeaders = headers || new Headers();
  responseHeaders.set('X-Idempotent-Replay', 'true');
  responseHeaders.set('X-Idempotent-Cached-At', new Date().toISOString());
  
  return {
    body: {
      success: true,
      data: cachedResponse,
      _idempotent: {
        replayed: true,
        message: 'Duplicate request - returning cached response'
      }
    },
    headers: responseHeaders
  };
}
