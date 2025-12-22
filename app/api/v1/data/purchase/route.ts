import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { 
  validateApiKey, 
  generateTransactionId,
  sendWebhooksForEvent,
  successResponse,
  errorResponse,
  logUsage
} from '@/lib/api-helpers';

// Datamart API Configuration
const DATAMART_API_URL = process.env.DATAMART_API_URL || 'https://api.datamartgh.shop/api/developer';
const DATAMART_API_KEY = process.env.DATAMART_API_KEY;

// Network mapping for our API -> Datamart
const NETWORK_MAP: Record<string, string> = {
  'mtn': 'YELLO',
  'MTN': 'YELLO',
  'YELLO': 'YELLO',
  'vodafone': 'TELECEL',
  'telecel': 'TELECEL',
  'TELECEL': 'TELECEL',
  'airteltigo': 'AT_PREMIUM',
  'airtel': 'AT_PREMIUM',
  'tigo': 'AT_PREMIUM',
  'AT_PREMIUM': 'AT_PREMIUM',
  'at': 'AT_PREMIUM'
};

// POST /api/v1/data/purchase - Purchase data bundle
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // Check if customer account is active
    if (!keyData.customers.is_active) {
      return errorResponse('Account suspended. Contact support.', 403, 'ACCOUNT_SUSPENDED');
    }

    const customerId = keyData.customer_id;
    const apiKeyId = keyData.id;

    // 2. Parse request body
    const body = await request.json();
    const { 
      phone_number, 
      network, 
      capacity_gb,
      reference,
      metadata 
    } = body;

    // 3. Validate required fields
    if (!phone_number) {
      return errorResponse('phone_number is required', 400, 'MISSING_FIELD');
    }
    if (!network) {
      return errorResponse('network is required (mtn, telecel, airteltigo)', 400, 'MISSING_FIELD');
    }
    if (!capacity_gb) {
      return errorResponse('capacity_gb is required', 400, 'MISSING_FIELD');
    }

    // Normalize phone number (remove spaces, handle Ghana format)
    let normalizedPhone = phone_number.replace(/\s/g, '');
    if (normalizedPhone.startsWith('+233')) {
      normalizedPhone = '0' + normalizedPhone.slice(4);
    } else if (normalizedPhone.startsWith('233')) {
      normalizedPhone = '0' + normalizedPhone.slice(3);
    }

    // Validate phone number format
    if (!/^0[235]\d{8}$/.test(normalizedPhone)) {
      return errorResponse(
        'Invalid Ghana phone number. Use format: 0241234567 or +233241234567', 
        400, 
        'INVALID_PHONE'
      );
    }

    // Map network to Datamart format
    const datamartNetwork = NETWORK_MAP[network.toLowerCase()] || NETWORK_MAP[network];
    if (!datamartNetwork) {
      return errorResponse(
        'Invalid network. Supported: mtn, telecel, airteltigo', 
        400, 
        'INVALID_NETWORK'
      );
    }

    // Check Datamart API key is configured
    if (!DATAMART_API_KEY) {
      return errorResponse('Data service not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    // 4. Generate transaction ID
    const transactionId = generateTransactionId('data');
    const supabase = createAdminClient();

    // 4.5 Look up package pricing from database
    const networkCodeMap: Record<string, string> = {
      'YELLO': 'mtn',
      'TELECEL': 'telecel',
      'AT_PREMIUM': 'airteltigo'
    };
    const networkCode = networkCodeMap[datamartNetwork];

    const { data: packageData, error: packageError } = await supabase
      .from('data_packages')
      .select('*')
      .eq('network_code', networkCode)
      .eq('capacity_gb', capacity_gb)
      .eq('in_stock', true)
      .single();

    // If package not found in DB, calculate with default margin
    let providerPrice: number;
    let ourPrice: number;
    let marginPercent: number;
    let marginAmount: number;

    if (packageData) {
      providerPrice = packageData.provider_price;
      ourPrice = packageData.our_price;
      marginPercent = packageData.margin_percent;
      marginAmount = packageData.margin_amount;
    } else {
      // Fallback: Get margin from settings and calculate
      const { data: marginSetting } = await supabase
        .from('pricing_settings')
        .select('default_margin_percent')
        .eq('service_type', 'data')
        .single();

      marginPercent = marginSetting?.default_margin_percent || 15;
      // We'll get the actual price from Datamart response
      providerPrice = 0;
      ourPrice = 0;
      marginAmount = 0;
    }

    // 5. Create pending transaction in our database
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        customer_id: customerId,
        api_key_id: apiKeyId,
        type: 'data',
        status: 'pending',
        provider: 'datamart',
        destination: normalizedPhone,
        request_data: {
          phone_number: normalizedPhone,
          network: datamartNetwork,
          capacity_gb,
          original_network: network,
          reference,
          metadata
        },
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to create transaction:', JSON.stringify(insertError, null, 2));
      return errorResponse(`Failed to initiate transaction: ${insertError.message}`, 500, 'DATABASE_ERROR');
    }

    // 6. Call Datamart API
    let datamartResponse;
    let datamartData;
    
    try {
      datamartResponse = await fetch(`${DATAMART_API_URL}/purchase`, {
        method: 'POST',
        headers: {
          'X-API-Key': DATAMART_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          network: datamartNetwork,
          capacity: String(capacity_gb),
          gateway: 'wallet'
        })
      });

      datamartData = await datamartResponse.json();
    } catch (fetchError) {
      // Update transaction as failed
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          failure_reason: 'Provider connection failed',
          failed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startTime
        })
        .eq('id', transactionId);

      return errorResponse('Failed to connect to data provider', 502, 'PROVIDER_ERROR');
    }

    // 7. Process Datamart response
    const processingTime = Date.now() - startTime;

    if (datamartData.status === 'success') {
      // Success - update transaction
      const { data: datamartResult } = datamartData;
      
      // If we didn't have DB pricing, calculate from Datamart's actual price
      if (providerPrice === 0) {
        providerPrice = datamartResult.price;
        ourPrice = providerPrice * (1 + marginPercent / 100);
        marginAmount = ourPrice - providerPrice;
      }
      
      await supabase
        .from('transactions')
        .update({
          status: datamartResult.orderStatus === 'completed' ? 'delivered' : 'sent',
          provider_id: datamartResult.purchaseId,
          response_data: {
            purchase_id: datamartResult.purchaseId,
            transaction_reference: datamartResult.transactionReference,
            order_reference: datamartResult.orderReference,
            provider_price_ghs: datamartResult.price,
            our_price_ghs: ourPrice,
            margin_percent: marginPercent,
            processing_method: datamartResult.processingMethod,
            order_status: datamartResult.orderStatus
          },
          cost: providerPrice, // What we pay Datamart
          price: ourPrice, // What we charge customer
          margin: marginAmount, // Our profit
          currency: 'GHS',
          sent_at: new Date().toISOString(),
          processing_time_ms: processingTime
        })
        .eq('id', transactionId);

      // Log API usage
      await logUsage(customerId, apiKeyId, '/api/v1/data/purchase', 'POST');

      // 8. Send webhook to customer
      await sendWebhooksForEvent(
        transactionId,
        customerId,
        'data.purchased',
        {
          transaction_id: transactionId,
          phone_number: normalizedPhone,
          network: network,
          capacity_gb,
          status: datamartResult.orderStatus === 'completed' ? 'delivered' : 'processing',
          processing_method: datamartResult.processingMethod,
          price: {
            amount: ourPrice,
            currency: 'GHS'
          },
          provider_reference: datamartResult.transactionReference,
          order_reference: datamartResult.orderReference,
          reference,
          metadata
        }
      );

      // Return success response
      return successResponse({
        transaction_id: transactionId,
        status: datamartResult.orderStatus === 'completed' ? 'delivered' : 'processing',
        phone_number: normalizedPhone,
        network: network,
        capacity_gb,
        price: {
          amount: ourPrice,
          currency: 'GHS'
        },
        provider_reference: datamartResult.transactionReference,
        order_reference: datamartResult.orderReference,
        processing_method: datamartResult.processingMethod,
        message: datamartResult.processingMethod === 'manual' 
          ? 'Order placed successfully. Processing manually (may take a few minutes).'
          : 'Data bundle delivered successfully.',
        reference,
        created_at: new Date().toISOString()
      }, 201);

    } else {
      // Failed - update transaction
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          failure_reason: datamartData.message || 'Purchase failed',
          response_data: datamartData,
          failed_at: new Date().toISOString(),
          processing_time_ms: processingTime
        })
        .eq('id', transactionId);

      // Send failure webhook
      await sendWebhooksForEvent(
        transactionId,
        customerId,
        'data.failed',
        {
          transaction_id: transactionId,
          phone_number: normalizedPhone,
          network,
          capacity_gb,
          status: 'failed',
          error: datamartData.message || 'Purchase failed',
          reference,
          metadata
        }
      );

      return errorResponse(
        datamartData.message || 'Data purchase failed',
        400,
        'PURCHASE_FAILED',
        { provider_message: datamartData.message }
      );
    }

  } catch (error) {
    console.error('Data purchase error:', error);
    return errorResponse(
      'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }
}

// GET /api/v1/data/purchase - Get transaction status
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    const customerId = keyData.customer_id;
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transaction_id');

    if (!transactionId) {
      return errorResponse('transaction_id query parameter is required', 400, 'MISSING_FIELD');
    }

    // Fetch transaction
    const supabase = createAdminClient();
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('customer_id', customerId)
      .eq('type', 'data')
      .single();

    if (error || !transaction) {
      return errorResponse('Transaction not found', 404, 'NOT_FOUND');
    }

    return successResponse({
      transaction_id: transaction.id,
      status: transaction.status,
      phone_number: transaction.destination,
      network: transaction.request_data?.original_network,
      capacity_gb: transaction.request_data?.capacity_gb,
      price: transaction.price ? {
        amount: transaction.price,
        currency: transaction.currency
      } : null,
      provider_reference: transaction.response_data?.transaction_reference,
      order_reference: transaction.response_data?.order_reference,
      processing_method: transaction.response_data?.processing_method,
      failure_reason: transaction.failure_reason,
      reference: transaction.request_data?.reference,
      metadata: transaction.request_data?.metadata,
      created_at: transaction.created_at,
      sent_at: transaction.sent_at,
      delivered_at: transaction.delivered_at,
      failed_at: transaction.failed_at
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
