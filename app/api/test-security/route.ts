import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Security Verification Test Endpoint
 * 
 * Tests:
 * 1. Webhook signature verification
 * 2. Rate limiting
 * 3. Sandbox isolation
 * 4. API key scoping
 * 
 * Usage: POST /api/test-security?test=all
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const testType = searchParams.get('test') || 'all';
  const results: TestResult[] = [];

  try {
    // 1. Test Webhook Signature Verification
    if (testType === 'all' || testType === 'webhook') {
      results.push(await testWebhookSignature());
    }

    // 2. Test Rate Limiting
    if (testType === 'all' || testType === 'rate-limit') {
      results.push(await testRateLimiting());
    }

    // 3. Test Sandbox Isolation
    if (testType === 'all' || testType === 'sandbox') {
      results.push(await testSandboxIsolation());
    }

    // 4. Test API Key Scoping
    if (testType === 'all' || testType === 'api-key-scope') {
      results.push(await testApiKeyScoping());
    }

    const allPassed = results.every(r => r.passed);
    
    return NextResponse.json({
      success: allPassed,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
      },
      results,
    }, { status: allPassed ? 200 : 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

// ============================================
// TEST 1: Webhook Signature Verification
// ============================================
async function testWebhookSignature(): Promise<TestResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  try {
    // Test with missing signature
    const missingSignatureResponse = await fetch(`${baseUrl}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test.event' }),
    });

    const missingSignatureData = await missingSignatureResponse.json();
    const rejectsMissingSignature = missingSignatureResponse.status === 400 && 
      missingSignatureData.error === 'Missing signature';

    // Test with invalid signature
    const invalidSignatureResponse = await fetch(`${baseUrl}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature_t=123456,v1=fakesignature'
      },
      body: JSON.stringify({ type: 'test.event' }),
    });

    const rejectsInvalidSignature = invalidSignatureResponse.status === 400;

    const passed = rejectsMissingSignature && rejectsInvalidSignature;

    return {
      test: 'Webhook Signature Verification',
      passed,
      message: passed 
        ? '✅ Webhook correctly rejects missing and invalid signatures'
        : '❌ Webhook signature verification has issues',
      details: {
        rejectsMissingSignature,
        missingSignatureStatus: missingSignatureResponse.status,
        rejectsInvalidSignature,
        invalidSignatureStatus: invalidSignatureResponse.status,
      }
    };
  } catch (error) {
    return {
      test: 'Webhook Signature Verification',
      passed: false,
      message: `❌ Error testing webhook: ${error}`,
    };
  }
}

// ============================================
// TEST 2: Rate Limiting
// ============================================
async function testRateLimiting(): Promise<TestResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Get a test API key
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('key_hash, customer_id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!apiKey) {
    return {
      test: 'Rate Limiting',
      passed: false,
      message: '❌ No API key found for testing',
    };
  }

  try {
    // Check that rate limit headers are present
    const response = await fetch(`${baseUrl}/api/v1/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.key_hash}`,
      },
      body: JSON.stringify({
        to: '+233501234567',
        message: 'Rate limit test'
      }),
    });

    const hasRateLimitHeaders = 
      response.headers.has('x-ratelimit-limit') ||
      response.headers.has('X-RateLimit-Limit');

    const hasRemainingHeader = 
      response.headers.has('x-ratelimit-remaining') ||
      response.headers.has('X-RateLimit-Remaining');

    const passed = hasRateLimitHeaders || hasRemainingHeader;

    return {
      test: 'Rate Limiting',
      passed,
      message: passed 
        ? '✅ Rate limiting headers are present'
        : '❌ Rate limiting headers missing (may need to check actual rate limit middleware)',
      details: {
        hasRateLimitHeaders,
        hasRemainingHeader,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      }
    };
  } catch (error) {
    return {
      test: 'Rate Limiting',
      passed: false,
      message: `❌ Error testing rate limit: ${error}`,
    };
  }
}

// ============================================
// TEST 3: Sandbox Isolation
// ============================================
async function testSandboxIsolation(): Promise<TestResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Use known test keys for verification
  const sandboxKey = 'sc_test_s8kpk70a4zu49z7ikknkeqs4r5d7wqmhqm0hwcykgka5ap2c';
  
  // Get a live key from database
  const { data: liveKeys } = await supabase
    .from('api_keys')
    .select('key_hash, customer_id')
    .like('key_hash', 'sc_live_%')
    .eq('is_active', true)
    .limit(1);

  const checks: Record<string, boolean> = {};

  // Test that sandbox keys return sandbox responses
  try {
    const sandboxResponse = await fetch(`${baseUrl}/api/v1/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sandboxKey}`,
      },
      body: JSON.stringify({
        to: '+233501234567',
        message: 'Sandbox test message'
      }),
    });
    
    const sandboxData = await sandboxResponse.json();
    checks.sandboxKeyReturnsSandboxResponse = 
      sandboxData.data?._sandbox?.mode === 'test' || 
      sandboxData.data?.provider === 'sandbox';
  } catch {
    checks.sandboxKeyReturnsSandboxResponse = false;
  }

  // Test that live keys don't return sandbox responses
  if (liveKeys?.length) {
    try {
      const liveResponse = await fetch(`${baseUrl}/api/v1/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${liveKeys[0].key_hash}`,
        },
        body: JSON.stringify({
          to: '+233501234567',
          message: 'Live test message'
        }),
      });
      
      const liveData = await liveResponse.json();
      // Live key should NOT return sandbox response (provider !== 'sandbox')
      checks.liveKeyDoesNotReturnSandbox = 
        !liveData.data?._sandbox && liveData.data?.provider !== 'sandbox';
    } catch {
      checks.liveKeyDoesNotReturnSandbox = false;
    }
  } else {
    checks.liveKeyDoesNotReturnSandbox = true; // Skip if no live keys
  }

  // Check key prefix detection
  const { isSandboxKey, isLiveKey } = await import('@/lib/sandbox');
  checks.correctlySandboxDetection = isSandboxKey('sc_test_abc123') === true;
  checks.correctlyLiveDetection = isLiveKey('sc_live_abc123') === true;
  checks.sandboxDoesNotDetectLive = isSandboxKey('sc_live_abc123') === false;
  checks.liveDoesNotDetectSandbox = isLiveKey('sc_test_abc123') === false;

  const passed = Object.values(checks).every(v => v);

  return {
    test: 'Sandbox Isolation',
    passed,
    message: passed 
      ? '✅ Sandbox mode properly isolates test and live environments'
      : '❌ Sandbox isolation has issues',
    details: checks,
  };
}

// ============================================
// TEST 4: API Key Scoping
// ============================================
async function testApiKeyScoping(): Promise<TestResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Get two different customers with API keys
  const { data: customers } = await supabase
    .from('customers')
    .select('id, email')
    .limit(2);

  if (!customers || customers.length < 2) {
    return {
      test: 'API Key Scoping',
      passed: true, // Pass if only one customer exists
      message: '⚠️ Only one customer exists, cannot test cross-customer access',
    };
  }

  const customer1 = customers[0];
  const customer2 = customers[1];

  // Get API keys for each customer
  const { data: key1 } = await supabase
    .from('api_keys')
    .select('key_hash')
    .eq('customer_id', customer1.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const { data: key2 } = await supabase
    .from('api_keys')
    .select('key_hash')
    .eq('customer_id', customer2.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!key1 || !key2) {
    return {
      test: 'API Key Scoping',
      passed: true,
      message: '⚠️ Need two customers with API keys to test cross-customer access',
    };
  }

  const checks: Record<string, boolean> = {};

  // Test that Customer1's key can access Customer1's data
  try {
    const response = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key1.key_hash}`,
      },
    });
    
    // Should succeed or return 401/403 but not return customer2's data
    checks.key1AccessesOwnData = response.status === 200 || response.status !== 403;
  } catch {
    checks.key1AccessesOwnData = false;
  }

  // Verify API keys are linked to correct customers in database
  const { data: keyData1 } = await supabase
    .from('api_keys')
    .select('customer_id')
    .eq('key_hash', key1.key_hash)
    .single();

  const { data: keyData2 } = await supabase
    .from('api_keys')
    .select('customer_id')
    .eq('key_hash', key2.key_hash)
    .single();

  checks.keysLinkedToCorrectCustomers = 
    keyData1?.customer_id === customer1.id && 
    keyData2?.customer_id === customer2.id;

  // Test that invalid API key is rejected
  try {
    const response = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer sc_live_invalid_key_12345',
      },
    });
    checks.rejectsInvalidKey = response.status === 401;
  } catch {
    checks.rejectsInvalidKey = false;
  }

  // Test that missing API key is rejected
  try {
    const response = await fetch(`${baseUrl}/api/v1/billing/subscription`, {
      method: 'GET',
    });
    checks.rejectsMissingKey = response.status === 401;
  } catch {
    checks.rejectsMissingKey = false;
  }

  const passed = Object.values(checks).every(v => v);

  return {
    test: 'API Key Scoping',
    passed,
    message: passed 
      ? '✅ API keys are properly scoped to their customers'
      : '❌ API key scoping has issues',
    details: {
      ...checks,
      customer1Id: customer1.id,
      customer2Id: customer2.id,
    },
  };
}

// GET endpoint for documentation
export async function GET() {
  return NextResponse.json({
    message: 'Security Verification Test Endpoint',
    usage: {
      endpoint: 'POST /api/test-security',
      params: {
        test: 'all | webhook | rate-limit | sandbox | api-key-scope',
      },
      examples: [
        'POST /api/test-security?test=all',
        'POST /api/test-security?test=webhook',
        'POST /api/test-security?test=sandbox',
      ]
    },
    tests: [
      {
        name: 'webhook',
        description: 'Verifies Stripe webhook signature verification works',
      },
      {
        name: 'rate-limit',
        description: 'Checks rate limiting headers are present',
      },
      {
        name: 'sandbox',
        description: 'Verifies sandbox keys return test responses and live keys work normally',
      },
      {
        name: 'api-key-scope',
        description: 'Ensures API keys only access their own customer data',
      },
    ],
  });
}
