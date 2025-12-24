import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { validateApiKey, errorResponse } from '@/lib/api-helpers';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '');

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

// GET /api/v1/billing/invoices - Get customer invoices from Stripe
export async function GET(request: NextRequest) {
  try {
    let customerId: string | null = null;
    let stripeCustomerId: string | null = null;

    // First try API key auth
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const keyData = await validateApiKey(request);
      if (keyData) {
        customerId = keyData.customer_id;
      }
    }

    // If no API key, try session-based auth (for dashboard)
    if (!customerId) {
      const serverSupabase = await createServerClient();
      const { data: { user } } = await serverSupabase.auth.getUser();
      
      if (user) {
        const db = getSupabase();
        const { data: customer } = await db
          .from('customers')
          .select('id, stripe_customer_id')
          .eq('auth_user_id', user.id)
          .single();
        
        if (customer) {
          customerId = customer.id;
          stripeCustomerId = customer.stripe_customer_id;
        } else if (user.email) {
          // Fallback: find by email
          const { data: customerByEmail } = await db
            .from('customers')
            .select('id, stripe_customer_id')
            .eq('email', user.email)
            .single();
          
          if (customerByEmail) {
            customerId = customerByEmail.id;
            stripeCustomerId = customerByEmail.stripe_customer_id;
          }
        }
      }
    }

    if (!customerId) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const db = getSupabase();

    // Get Stripe customer ID if not already fetched
    if (!stripeCustomerId) {
      const { data: customer } = await db
        .from('customers')
        .select('stripe_customer_id')
        .eq('id', customerId)
        .single();
      
      stripeCustomerId = customer?.stripe_customer_id;
    }

    // Get query params for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // paid, unpaid, all

    // If customer has Stripe ID, fetch invoices from Stripe
    if (stripeCustomerId) {
      try {
        const stripeInvoices = await stripe.invoices.list({
          customer: stripeCustomerId,
          limit: limit,
          starting_after: page > 1 ? undefined : undefined, // For pagination, you'd need to track cursor
          status: status === 'paid' ? 'paid' : status === 'unpaid' ? 'open' : undefined,
        });

        const formattedInvoices = stripeInvoices.data.map(invoice => ({
          id: invoice.id,
          invoiceNumber: invoice.number || `INV-${invoice.created}`,
          date: new Date(invoice.created * 1000).toISOString(),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
          status: invoice.status === 'paid' ? 'paid' 
            : invoice.status === 'open' ? 'pending'
            : invoice.status === 'uncollectible' ? 'overdue'
            : invoice.status === 'void' ? 'cancelled'
            : 'pending',
          amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
          amountPaid: (invoice.amount_paid || 0) / 100,
          amountDue: (invoice.amount_due || 0) / 100,
          currency: invoice.currency.toUpperCase(),
          planName: invoice.lines.data[0]?.description || 'Subscription',
          billingCycle: invoice.lines.data[0]?.period ? 
            (new Date((invoice.lines.data[0].period.end || 0) * 1000).getTime() - 
             new Date((invoice.lines.data[0].period.start || 0) * 1000).getTime() > 60 * 24 * 60 * 60 * 1000 
              ? 'yearly' : 'monthly') 
            : 'monthly',
          pdfUrl: invoice.invoice_pdf || null,
          hostedUrl: invoice.hosted_invoice_url || null,
          paidAt: invoice.status_transitions?.paid_at 
            ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
            : null,
          periodStart: invoice.lines.data[0]?.period?.start 
            ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
            : null,
          periodEnd: invoice.lines.data[0]?.period?.end
            ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
            : null,
        }));

        return NextResponse.json({
          success: true,
          invoices: formattedInvoices,
          pagination: {
            page,
            limit,
            total: stripeInvoices.data.length,
            hasMore: stripeInvoices.has_more,
          },
        });
      } catch (stripeError) {
        console.error('Stripe invoices fetch error:', stripeError);
        // Fall through to database fallback
      }
    }

    // Fallback to database invoices if no Stripe customer or Stripe fails
    const offset = (page - 1) * limit;
    let query = db
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: invoices, error, count } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return errorResponse('Failed to fetch invoices', 500, 'INTERNAL_ERROR');
    }

    // Transform to frontend-friendly format
    const formattedInvoices = invoices?.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      date: invoice.invoice_date || invoice.created_at,
      dueDate: invoice.due_date,
      status: invoice.status,
      amount: invoice.total || invoice.amount,
      amountPaid: invoice.amount_paid || (invoice.status === 'paid' ? invoice.amount : 0),
      amountDue: invoice.amount_due || (invoice.status !== 'paid' ? invoice.amount : 0),
      currency: invoice.currency || 'USD',
      planName: invoice.plan_name || 'Subscription',
      billingCycle: invoice.billing_cycle,
      pdfUrl: invoice.pdf_url,
      paidAt: invoice.paid_at,
    }));

    return NextResponse.json({
      success: true,
      invoices: formattedInvoices || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Invoices API error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
