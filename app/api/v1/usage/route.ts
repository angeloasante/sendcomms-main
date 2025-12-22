import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, errorResponse } from '@/lib/api-helpers';
import { getRateLimitUsage, getServiceUsage, PlanType } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    const plan = keyData.customers.plan as PlanType;
    
    // Get overall rate limit usage
    const globalUsage = await getRateLimitUsage(keyData.customer_id, plan);
    
    // Get service-specific usage
    const [emailUsage, smsUsage, airtimeUsage, dataUsage] = await Promise.all([
      getServiceUsage(keyData.customer_id, plan, 'email'),
      getServiceUsage(keyData.customer_id, plan, 'sms'),
      getServiceUsage(keyData.customer_id, plan, 'airtime'),
      getServiceUsage(keyData.customer_id, plan, 'data')
    ]);

    return NextResponse.json({
      success: true,
      data: {
        plan,
        global: globalUsage,
        services: {
          email: emailUsage,
          sms: smsUsage,
          airtime: airtimeUsage,
          data: dataUsage
        }
      }
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return errorResponse('Failed to fetch usage', 500, 'INTERNAL_ERROR');
  }
}
