import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client lazily to handle build time
let supabaseAdmin: SupabaseClient | null = null;

const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not configured');
    }
    
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseAdmin;
};

// Pricing configuration (cost = what we pay, price = what we charge)
// Ensure we ALWAYS make profit
export const PRICING = {
  email: {
    costPerEmail: 0.0004,     // Resend charges ~$0.0004/email
    pricePerEmail: 0.001,     // We charge $0.001/email (150% markup)
    minCharge: 0.01           // Minimum charge per request
  },
  sms: {
    costPerSms: 0.02,         // Average SMS cost
    pricePerSms: 0.035,       // We charge (75% markup)
    minCharge: 0.05
  },
  airtime: {
    marginPercent: 0.03,      // 3% margin on airtime
    minMargin: 0.10           // Minimum $0.10 margin
  },
  data: {
    marginPercent: 0.05,      // 5% margin on data
    minMargin: 0.15           // Minimum $0.15 margin
  }
};

// API key validation result interface
export interface ApiKeyData {
  id: string;
  key_hash: string;
  customer_id: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  customers: {
    id: string;
    email: string;
    name: string;
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    balance: number;
    webhook_url: string | null;
    webhook_secret: string | null;
    is_active: boolean;
  };
}

// API key validation helper - full implementation
export async function validateApiKey(request: NextRequest): Promise<ApiKeyData | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const apiKey = authHeader.replace('Bearer ', '').trim();
  
  if (!apiKey) {
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    
    // We store the key directly (not hashed) for simplicity
    // In production, you should hash the key
    
    // Look up API key with customer data
    const { data, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        key_hash,
        customer_id,
        name,
        permissions,
        is_active,
        last_used_at,
        customers (
          id,
          email,
          name,
          plan,
          balance,
          webhook_url,
          webhook_secret,
          is_active
        )
      `)
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return null;
    }

    // Check if customer is active - customers comes as an object from single()
    const customerData = data.customers;
    const customer = (Array.isArray(customerData) ? customerData[0] : customerData) as ApiKeyData['customers'];
    
    if (!customer?.is_active) {
      return null;
    }

    // Update last used timestamp (fire and forget)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {});
    
    return {
      ...data,
      customers: customer
    } as ApiKeyData;
    
  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
}

// Check customer balance (for prepaid plans)
export async function checkBalance(customerId: string, requiredAmount: number): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('customers')
    .select('balance, plan')
    .eq('id', customerId)
    .single();
  
  if (error || !data) {
    throw new Error('Failed to check balance');
  }

  // Free and paid plans don't need balance check (post-paid or included)
  if (data.plan !== 'prepaid') {
    return true;
  }

  if (data.balance < requiredAmount) {
    throw new Error('Insufficient balance');
  }

  return true;
}

// Deduct from customer balance
export async function deductBalance(customerId: string, amount: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  // Use RPC for atomic balance deduction
  const { error } = await supabase.rpc('deduct_balance', {
    p_customer_id: customerId,
    p_amount: amount
  });

  if (error) {
    // Fallback to regular update if RPC doesn't exist
    const { data: customer } = await supabase
      .from('customers')
      .select('balance')
      .eq('id', customerId)
      .single();

    if (customer) {
      await supabase
        .from('customers')
        .update({ balance: customer.balance - amount })
        .eq('id', customerId);
    }
  }
}

// Log API usage
export async function logUsage(
  customerId: string,
  apiKeyId: string,
  endpoint: string,
  method: string = 'POST'
): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  await supabase
    .from('usage_logs')
    .insert({
      customer_id: customerId,
      api_key_id: apiKeyId,
      endpoint,
      method,
      timestamp: new Date().toISOString()
    });
}

// Send webhook to customer
export async function sendWebhook(
  transactionId: string,
  customerId: string,
  webhookUrl: string,
  webhookSecret: string | null,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    const body = JSON.stringify({
      ...payload,
      transaction_id: transactionId,
      timestamp: new Date().toISOString()
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SendComms-Webhook/1.0'
    };

    // Add signature if webhook secret is configured
    if (webhookSecret) {
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      headers['X-SendComms-Signature'] = `sha256=${signature}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body
    });

    // Log webhook delivery attempt
    const supabase = getSupabaseAdmin();
    await supabase
      .from('webhook_logs')
      .insert({
        transaction_id: transactionId,
        customer_id: customerId,
        url: webhookUrl,
        payload,
        status_code: response.status,
        success: response.ok,
        attempted_at: new Date().toISOString()
      });

    return response.ok;
  } catch (error) {
    console.error('Webhook delivery failed:', error);
    
    // Log failed attempt
    const supabase = getSupabaseAdmin();
    await supabase
      .from('webhook_logs')
      .insert({
        transaction_id: transactionId,
        customer_id: customerId,
        url: webhookUrl,
        payload,
        status_code: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempted_at: new Date().toISOString()
      });
    
    return false;
  }
}

// Standard API response helpers
export function successResponse(data: unknown, status = 200, headers?: Headers) {
  const response = NextResponse.json({
    success: true,
    data,
  }, { status });
  
  if (headers) {
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

// Error code to docs anchor mapping
const ERROR_DOCS_ANCHORS: Record<string, string> = {
  'UNAUTHORIZED': '#client-error-codes',
  'ACCOUNT_SUSPENDED': '#client-error-codes',
  'INSUFFICIENT_BALANCE': '#client-error-codes',
  'RATE_LIMIT_EXCEEDED': '#client-error-codes',
  'INVALID_PHONE_NUMBER': '#client-error-codes',
  'INVALID_EMAIL': '#client-error-codes',
  'MESSAGE_TOO_LONG': '#client-error-codes',
  'MISSING_FIELD': '#client-error-codes',
  'INVALID_REQUEST': '#client-error-codes',
  'INVALID_JSON': '#client-error-codes',
  'SMS_SEND_FAILED': '#service-error-codes',
  'EMAIL_SEND_FAILED': '#service-error-codes',
  'DATA_PURCHASE_FAILED': '#service-error-codes',
  'AIRTIME_PURCHASE_FAILED': '#service-error-codes',
  'INTERNAL_ERROR': '#service-error-codes',
};

export function errorResponse(
  message: string, 
  status = 400, 
  code?: string,
  details?: Record<string, unknown>
) {
  const errorCode = code || 'ERROR';
  const anchor = ERROR_DOCS_ANCHORS[errorCode] || '';
  
  return NextResponse.json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...details,
      docs_url: `https://docs.sendcomms.com/docs/errors${anchor}`
    }
  }, { status });
}

// Webhook signature verification (for incoming webhooks from providers)
export function verifyWebhookSignature(
  payload: string, 
  signature: string, 
  secret: string,
  algorithm: 'sha256' | 'sha1' = 'sha256'
): boolean {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');
  
  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Generate unique transaction ID
export function generateTransactionId(prefix: string = 'txn'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${timestamp}_${randomPart}`;
}

// Generate API key
export function generateApiKey(): { key: string; hash: string } {
  const key = `ac_live_${crypto.randomBytes(24).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, hash };
}

// Validate email address
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (basic E.164 format)
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Calculate price with margin (ensure profit)
export function calculatePrice(
  cost: number, 
  service: keyof typeof PRICING
): { cost: number; price: number; margin: number } {
  const config = PRICING[service];
  
  let price: number;
  let margin: number;

  if ('marginPercent' in config) {
    // Percentage-based pricing (airtime, data)
    margin = Math.max(cost * config.marginPercent, config.minMargin);
    price = cost + margin;
  } else if ('pricePerEmail' in config) {
    // Email pricing
    price = Math.max(config.pricePerEmail, config.minCharge);
    margin = price - config.costPerEmail;
  } else if ('pricePerSms' in config) {
    // SMS pricing
    price = Math.max(config.pricePerSms, config.minCharge);
    margin = price - config.costPerSms;
  } else {
    // Fallback
    price = cost * 1.5;
    margin = price - cost;
  }

  return {
    cost: Math.round(cost * 10000) / 10000,
    price: Math.round(price * 10000) / 10000,
    margin: Math.round(margin * 10000) / 10000
  };
}

// Send webhooks to all registered endpoints that subscribe to this event
export async function sendWebhooksForEvent(
  transactionId: string,
  customerId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  const supabase = getSupabaseAdmin();
  
  // Get all active webhook endpoints for this customer that subscribe to this event
  const { data: webhooks, error } = await supabase
    .from('customer_webhooks')
    .select('id, url, secret, events')
    .eq('customer_id', customerId)
    .eq('is_active', true);
  
  if (error || !webhooks || webhooks.length === 0) {
    // Fallback: check if customer has legacy webhook_url configured
    const { data: customer } = await supabase
      .from('customers')
      .select('webhook_url, webhook_secret')
      .eq('id', customerId)
      .single();
    
    if (customer?.webhook_url) {
      const success = await sendWebhook(
        transactionId,
        customerId,
        customer.webhook_url,
        customer.webhook_secret,
        { event, ...payload }
      );
      return { sent: success ? 1 : 0, failed: success ? 0 : 1 };
    }
    
    return { sent: 0, failed: 0 };
  }
  
  let sent = 0;
  let failed = 0;
  
  // Filter webhooks that subscribe to this event
  const matchingWebhooks = webhooks.filter(wh => 
    wh.events && (wh.events.includes(event) || wh.events.includes('*'))
  );
  
  // Send to all matching webhooks
  for (const webhook of matchingWebhooks) {
    const success = await sendWebhook(
      transactionId,
      customerId,
      webhook.url,
      webhook.secret,
      { event, ...payload }
    );
    
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }
  
  return { sent, failed };
}
