import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  verifyDomain, 
  getDomain,
  getDomainStatusDescription,
  type DomainStatus,
  type DomainRegion,
  type TlsSetting,
  type DnsRecord
} from '@/lib/email/domains';

// Database types for customer_domains table
interface CustomerDomain {
  id: string;
  customer_id: string;
  resend_domain_id: string;
  name: string;
  status: DomainStatus;
  region: DomainRegion;
  custom_return_path: string;
  open_tracking: boolean;
  click_tracking: boolean;
  tls: TlsSetting;
  sending_enabled: boolean;
  receiving_enabled: boolean;
  dns_records: DnsRecord[];
  is_primary: boolean;
  is_active: boolean;
  verified_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: string;
  auth_user_id: string;
  plan: string;
  [key: string]: unknown;
}

// Lazy initialization for admin client (bypasses RLS)
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabaseAdmin;
}

// Helper to get a typed table reference (workaround for missing DB types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTable(tableName: string): any {
  return getSupabaseAdmin().from(tableName);
}

// Helper to get authenticated user
async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if called from Server Component
          }
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// Helper to get customer and verify domain ownership
async function getCustomerAndDomain(authUserId: string, domainId: string): Promise<{ customer: Customer | null; domain: CustomerDomain | null }> {
  const { data: customerData } = await getSupabaseAdmin()
    .from('customers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  const customer = customerData as Customer | null;
  if (!customer) return { customer: null, domain: null };

  const { data: domainData } = await getSupabaseAdmin()
    .from('customer_domains')
    .select('*')
    .eq('id', domainId)
    .eq('customer_id', customer.id)
    .single();

  const domain = domainData as CustomerDomain | null;
  return { customer, domain };
}

interface RouteParams {
  params: Promise<{ domainId: string }>;
}

/**
 * POST /api/v1/domains/[domainId]/verify
 * Trigger DNS verification for a domain
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { domainId } = await params;

    // Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer and verify domain ownership
    const { customer, domain } = await getCustomerAndDomain(user.id, domainId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Don't verify if already verified
    if (domain.status === 'verified') {
      return NextResponse.json({
        success: true,
        data: {
          id: domain.id,
          name: domain.name,
          status: domain.status,
          status_description: getDomainStatusDescription(domain.status),
          already_verified: true
        },
        message: 'Domain is already verified'
      });
    }

    // Store previous status for logging
    const previousStatus = domain.status;

    // Trigger verification in Resend
    const verifyResult = await verifyDomain(domain.resend_domain_id);

    if (!verifyResult.success) {
      // Log failed attempt
      await getTable('domain_verification_logs')
        .insert({
          domain_id: domainId,
          customer_id: customer.id,
          previous_status: previousStatus,
          new_status: previousStatus,
          triggered_by: 'manual',
          error_message: verifyResult.error,
          metadata: { action: 'verify_failed' }
        });

      return NextResponse.json(
        { error: verifyResult.error || 'Failed to trigger verification' },
        { status: 400 }
      );
    }

    // Fetch the updated domain status from Resend
    const getDomainResult = await getDomain(domain.resend_domain_id);
    
    let newStatus: DomainStatus = 'pending';
    let dnsRecords: DnsRecord[] = domain.dns_records;
    let spfStatus: DomainStatus | null = null;
    let dkimStatus: DomainStatus | null = null;

    if (getDomainResult.success && getDomainResult.data) {
      newStatus = getDomainResult.data.status;
      dnsRecords = getDomainResult.data.records;
      
      // Extract SPF and DKIM status
      const spfRecord = getDomainResult.data.records.find(r => r.record === 'SPF');
      const dkimRecord = getDomainResult.data.records.find(r => r.record === 'DKIM');
      spfStatus = spfRecord?.status || null;
      dkimStatus = dkimRecord?.status || null;
    }

    // Update domain in database
    const updateData: {
      status: DomainStatus;
      dns_records: DnsRecord[];
      last_checked_at: string;
      verified_at?: string;
    } = {
      status: newStatus,
      dns_records: dnsRecords,
      last_checked_at: new Date().toISOString()
    };

    // Set verified_at if newly verified
    // Note: previousStatus is guaranteed not to be 'verified' due to the early return above
    if (newStatus === 'verified') {
      updateData.verified_at = new Date().toISOString();
    }

    await getTable('customer_domains')
      .update(updateData)
      .eq('id', domainId);

    // Log verification attempt
    await getTable('domain_verification_logs')
      .insert({
        domain_id: domainId,
        customer_id: customer.id,
        previous_status: previousStatus,
        new_status: newStatus,
        triggered_by: 'manual',
        spf_status: spfStatus,
        dkim_status: dkimStatus,
        metadata: { 
          action: 'verify',
          records_checked: dnsRecords?.length || 0
        }
      });

    // Build response message based on status
    let message = 'Verification initiated. DNS propagation may take up to 72 hours.';
    if (newStatus === 'verified') {
      message = 'Domain verified successfully! You can now send emails from this domain.';
    } else if (newStatus === 'failed') {
      message = 'Verification failed. Please check your DNS records and try again.';
    } else if (newStatus === 'temporary_failure') {
      message = 'DNS records temporarily not detected. Verification will retry automatically.';
    }

    return NextResponse.json({
      success: true,
      data: {
        id: domain.id,
        name: domain.name,
        status: newStatus,
        status_description: getDomainStatusDescription(newStatus),
        dns_records: dnsRecords,
        previous_status: previousStatus,
        verified_at: newStatus === 'verified' ? updateData.verified_at : null
      },
      message
    });

  } catch (error) {
    console.error('POST /api/v1/domains/[domainId]/verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
