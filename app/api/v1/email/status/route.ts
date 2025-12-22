import { NextRequest } from 'next/server';
import {
  validateApiKey,
  logUsage,
  successResponse,
  errorResponse
} from '@/lib/api-helpers';
import { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// GET /api/v1/email/status - Get email delivery status
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    const customerId = keyData.customer_id;
    const apiKeyId = keyData.id;

    // Get transaction_id or email_id from query params
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transaction_id');
    const emailId = searchParams.get('email_id');

    if (!transactionId && !emailId) {
      return errorResponse(
        'transaction_id or email_id query parameter is required',
        400,
        'MISSING_FIELD'
      );
    }

    const supabase = createAdminClient();

    // If we have a transaction_id, look up in our database first
    let transaction = null;
    let resendEmailId = emailId;

    if (transactionId) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('customer_id', customerId)
        .eq('type', 'email')
        .single();

      if (error || !data) {
        return errorResponse('Transaction not found', 404, 'NOT_FOUND');
      }

      transaction = data;
      resendEmailId = data.provider_id || data.response_data?.email_id;
    }

    // Fetch status from Resend if we have an email_id
    let resendStatus = null;
    if (resendEmailId) {
      try {
        const resendResponse = await resend.emails.get(resendEmailId);
        resendStatus = resendResponse.data;
      } catch (resendError) {
        console.error('Resend API error:', resendError);
        // Continue without Resend data if API fails
      }
    }

    // Log API usage
    await logUsage(customerId, apiKeyId, '/api/v1/email/status', 'GET');

    // Build response
    const response: Record<string, unknown> = {
      transaction_id: transactionId || null,
      email_id: resendEmailId || null,
      status: transaction?.status || (resendStatus ? 'sent' : 'unknown'),
      to: transaction?.destination || resendStatus?.to?.[0] || null,
      subject: transaction?.request_data?.subject || resendStatus?.subject || null,
      from: transaction?.request_data?.from || resendStatus?.from || null,
      created_at: transaction?.created_at || resendStatus?.created_at || null,
      sent_at: transaction?.sent_at || null,
      delivered_at: transaction?.delivered_at || null,
      failed_at: transaction?.failed_at || null,
      failure_reason: transaction?.failure_reason || null,
    };

    // Add Resend-specific data if available
    if (resendStatus) {
      response.provider_status = {
        id: resendStatus.id,
        status: resendStatus.last_event || 'sent',
        to: resendStatus.to,
        from: resendStatus.from,
        subject: resendStatus.subject,
        created_at: resendStatus.created_at,
      };
    }

    return successResponse(response);

  } catch (error) {
    console.error('Email status error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
