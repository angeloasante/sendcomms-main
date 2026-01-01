import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  createDomain, 
  listDomains,
  getDomainStatusDescription,
  type CreateDomainParams,
  type DomainRegion,
  type TlsSetting,
  type DomainStatus,
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

// Helper to get customer from auth user
async function getCustomer(authUserId: string): Promise<Customer | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('customers')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data) return null;
  return data as Customer;
}

/**
 * GET /api/v1/domains
 * List all domains for the authenticated customer
 */
export async function GET() {
  try {
    // Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get customer
    const customer = await getCustomer(user.id);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get domains from our database
    const { data: dbDomains, error: dbError } = await getSupabaseAdmin()
      .from('customer_domains')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Database error fetching domains:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      );
    }

    const domains = dbDomains as CustomerDomain[] | null;

    // Optionally sync with Resend to get latest status
    // This is done lazily - only if there are domains that need status updates
    const pendingDomains = (domains || []).filter(d => 
      ['not_started', 'pending', 'temporary_failure'].includes(d.status)
    );

    // Transform for response
    const responseDomains = (domains || []).map(d => ({
      id: d.id,
      resend_domain_id: d.resend_domain_id,
      name: d.name,
      status: d.status,
      status_description: getDomainStatusDescription(d.status),
      region: d.region,
      custom_return_path: d.custom_return_path,
      open_tracking: d.open_tracking,
      click_tracking: d.click_tracking,
      tls: d.tls,
      sending_enabled: d.sending_enabled,
      receiving_enabled: d.receiving_enabled,
      dns_records: d.dns_records,
      is_primary: d.is_primary,
      verified_at: d.verified_at,
      created_at: d.created_at
    }));

    return NextResponse.json({
      success: true,
      data: responseDomains,
      pending_verification: pendingDomains.length
    });

  } catch (error) {
    console.error('GET /api/v1/domains error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/domains
 * Create a new domain
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get customer
    const customer = await getCustomer(user.id);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      name, 
      region, 
      customReturnPath, 
      openTracking, 
      clickTracking, 
      tls,
      setPrimary 
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Domain name is required' },
        { status: 400 }
      );
    }

    // Check if domain already exists for this customer
    const { data: existingDomain } = await getSupabaseAdmin()
      .from('customer_domains')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('name', name.toLowerCase())
      .single();

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already exists for this account' },
        { status: 409 }
      );
    }

    // Check plan limits (optional - can be configured)
    const { count: domainCount } = await getSupabaseAdmin()
      .from('customer_domains')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
      .eq('is_active', true);

    const planLimits: Record<string, number> = {
      free: 1,
      starter: 3,
      pro: 10,
      business: 25,
    };
    const maxDomains = planLimits[customer.plan] || 1;

    if ((domainCount || 0) >= maxDomains) {
      return NextResponse.json(
        { 
          error: `Domain limit reached. Your ${customer.plan} plan allows ${maxDomains} domain(s). Please upgrade to add more domains.`,
          limit: maxDomains,
          current: domainCount
        },
        { status: 403 }
      );
    }

    // Create domain in Resend
    const createParams: CreateDomainParams = {
      name: name.toLowerCase(),
      region: region as DomainRegion,
      customReturnPath,
      openTracking: openTracking ?? false,
      clickTracking: clickTracking ?? false,
      tls: tls as TlsSetting
    };

    const result = await createDomain(createParams);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to create domain in Resend' },
        { status: 400 }
      );
    }

    const resendDomain = result.data;

    // Check if this is the first domain (auto-set as primary)
    const isFirst = (domainCount || 0) === 0;

    // Store in our database
    const { data: newDomainData, error: insertError } = await getTable('customer_domains')
      .insert({
        customer_id: customer.id,
        resend_domain_id: resendDomain.id,
        name: resendDomain.name,
        status: resendDomain.status,
        region: resendDomain.region,
        custom_return_path: customReturnPath || 'send',
        open_tracking: openTracking ?? false,
        click_tracking: clickTracking ?? false,
        tls: tls || 'opportunistic',
        sending_enabled: resendDomain.capabilities.sending === 'enabled',
        receiving_enabled: resendDomain.capabilities.receiving === 'enabled',
        dns_records: resendDomain.records,
        is_primary: isFirst || setPrimary === true
      })
      .select()
      .single();

    const newDomain = newDomainData as CustomerDomain | null;

    if (insertError || !newDomain) {
      console.error('Database insert error:', insertError);
      // Note: Domain was created in Resend but failed to save locally
      // Could implement cleanup here
      return NextResponse.json(
        { error: 'Failed to save domain. Please try again.' },
        { status: 500 }
      );
    }

    // Log verification attempt
    await getTable('domain_verification_logs')
      .insert({
        domain_id: newDomain.id,
        customer_id: customer.id,
        previous_status: null,
        new_status: resendDomain.status,
        triggered_by: 'manual',
        metadata: { action: 'create' }
      });

    return NextResponse.json({
      success: true,
      data: {
        id: newDomain.id,
        resend_domain_id: newDomain.resend_domain_id,
        name: newDomain.name,
        status: newDomain.status,
        status_description: getDomainStatusDescription(newDomain.status),
        region: newDomain.region,
        dns_records: newDomain.dns_records,
        is_primary: newDomain.is_primary,
        created_at: newDomain.created_at
      },
      message: 'Domain created successfully. Please add the DNS records to verify your domain.'
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/v1/domains error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
