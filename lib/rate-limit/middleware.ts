import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, PlanType, ServiceType } from './index';

export interface RateLimitResponse {
  allowed: boolean;
  headers: Headers;
}

export async function withRateLimit(
  req: NextRequest,
  customerId: string,
  plan: string,
  service?: string
): Promise<RateLimitResponse | NextResponse> {
  const result = await checkRateLimit(
    customerId,
    plan as PlanType,
    service as ServiceType | undefined
  );
  
  // Create rate limit headers
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  
  if (!result.allowed) {
    headers.set('Retry-After', result.retryAfter?.toString() || '60');
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.',
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
          retryAfter: result.retryAfter
        }
      },
      {
        status: 429,
        headers
      }
    );
  }
  
  return { allowed: true, headers };
}

// Helper to add rate limit headers to any response
export function addRateLimitHeaders(response: NextResponse, headers: Headers): NextResponse {
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}
