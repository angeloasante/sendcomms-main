import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateApiKey, errorResponse } from '@/lib/api-helpers';

// Lazy-initialized Supabase client
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

// GET /api/v1/billing/payment-methods - Get customer payment methods
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    const customerId = keyData.customer_id;
    const db = getSupabase();

    const { data: paymentMethods, error } = await db
      .from('payment_methods')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return errorResponse('Failed to fetch payment methods', 500, 'INTERNAL_ERROR');
    }

    // Transform to frontend-friendly format (hide sensitive data)
    const formattedMethods = paymentMethods?.map(method => ({
      id: method.id,
      type: method.type,
      provider: method.provider,
      isDefault: method.is_default,
      // Card info
      ...(method.type === 'card' && {
        card: {
          brand: method.card_brand,
          last4: method.card_last4,
          expMonth: method.card_exp_month,
          expYear: method.card_exp_year,
        },
      }),
      // Mobile money info
      ...(method.type === 'mobile_money' && {
        mobileMoney: {
          number: method.mobile_number ? `****${method.mobile_number.slice(-4)}` : null,
          network: method.mobile_network,
        },
      }),
      // Bank info
      ...(method.type === 'bank_transfer' && {
        bank: {
          name: method.bank_name,
          last4: method.account_last4,
        },
      }),
    }));

    return NextResponse.json({
      success: true,
      data: formattedMethods,
    });
  } catch (error) {
    console.error('Payment methods API error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// POST /api/v1/billing/payment-methods - Add a payment method
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    const customerId = keyData.customer_id;
    const db = getSupabase();
    const body = await request.json();

    const { type, provider, isDefault, ...details } = body;

    if (!type || !['card', 'mobile_money', 'bank_transfer'].includes(type)) {
      return errorResponse('Invalid payment method type', 400, 'INVALID_TYPE');
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db
        .from('payment_methods')
        .update({ is_default: false })
        .eq('customer_id', customerId);
    }

    const paymentMethodData: Record<string, unknown> = {
      customer_id: customerId,
      type,
      provider,
      is_default: isDefault || false,
    };

    // Add type-specific fields
    if (type === 'card') {
      paymentMethodData.card_brand = details.cardBrand;
      paymentMethodData.card_last4 = details.cardLast4;
      paymentMethodData.card_exp_month = details.cardExpMonth;
      paymentMethodData.card_exp_year = details.cardExpYear;
      paymentMethodData.stripe_payment_method_id = details.stripePaymentMethodId;
    } else if (type === 'mobile_money') {
      paymentMethodData.mobile_number = details.mobileNumber;
      paymentMethodData.mobile_network = details.mobileNetwork;
      paymentMethodData.paystack_authorization_code = details.paystackAuthorizationCode;
    } else if (type === 'bank_transfer') {
      paymentMethodData.bank_name = details.bankName;
      paymentMethodData.account_last4 = details.accountLast4;
    }

    const { data: newMethod, error } = await db
      .from('payment_methods')
      .insert(paymentMethodData)
      .select()
      .single();

    if (error) {
      console.error('Error adding payment method:', error);
      return errorResponse('Failed to add payment method', 500, 'INTERNAL_ERROR');
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newMethod.id,
        type: newMethod.type,
        isDefault: newMethod.is_default,
      },
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// DELETE /api/v1/billing/payment-methods - Remove a payment method
export async function DELETE(request: NextRequest) {
  try {
    // Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    const customerId = keyData.customer_id;
    const db = getSupabase();
    const { searchParams } = new URL(request.url);
    const methodId = searchParams.get('id');

    if (!methodId) {
      return errorResponse('Payment method ID required', 400, 'MISSING_ID');
    }

    // Soft delete (set is_active to false)
    const { error } = await db
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', methodId)
      .eq('customer_id', customerId);

    if (error) {
      console.error('Error removing payment method:', error);
      return errorResponse('Failed to remove payment method', 500, 'INTERNAL_ERROR');
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method removed',
    });
  } catch (error) {
    console.error('Remove payment method error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
