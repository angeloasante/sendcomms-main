import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  listDomains,
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
 * POST /api/v1/domains/sync
 * Sync all domains with Resend to get latest status
 * This is useful for refreshing status after DNS changes
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get customer
    const customer = await getCustomer(user.id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get all active domains for this customer
    const { data: customerDomainsData, error: dbError } = await getSupabaseAdmin()
      .from('customer_domains')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('is_active', true);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    const customerDomains = customerDomainsData as CustomerDomain[] | null;

    if (!customerDomains || customerDomains.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        synced: 0,
        message: 'No domains to sync'
      });
    }

    // Sync each domain with Resend
    const syncResults = await Promise.all(
      customerDomains.map(async (domain: CustomerDomain) => {
        try {
          const resendResult = await getDomain(domain.resend_domain_id);
          
          if (!resendResult.success || !resendResult.data) {
            return {
              id: domain.id,
              name: domain.name,
              synced: false,
              error: resendResult.error || 'Failed to fetch from Resend'
            };
          }

          const resendDomain = resendResult.data;
          const statusChanged = resendDomain.status !== domain.status;

          // Update local database
          const updateData: {
            status: DomainStatus;
            dns_records: DnsRecord[];
            last_checked_at: string;
            verified_at?: string;
          } = {
            status: resendDomain.status,
            dns_records: resendDomain.records,
            last_checked_at: new Date().toISOString()
          };

          // Set verified_at if newly verified
          if (resendDomain.status === 'verified' && domain.status !== 'verified') {
            updateData.verified_at = new Date().toISOString();
          }

          await getTable('customer_domains')
            .update(updateData)
            .eq('id', domain.id);

          // Log status change if any
          if (statusChanged) {
            await getTable('domain_verification_logs')
              .insert({
                domain_id: domain.id,
                customer_id: customer.id,
                previous_status: domain.status,
                new_status: resendDomain.status,
                triggered_by: 'auto',
                metadata: { action: 'sync' }
              });
          }

          return {
            id: domain.id,
            name: domain.name,
            synced: true,
            previous_status: domain.status,
            current_status: resendDomain.status,
            status_changed: statusChanged
          };

        } catch (error) {
          console.error(`Sync error for domain ${domain.name}:`, error);
          return {
            id: domain.id,
            name: domain.name,
            synced: false,
            error: 'Sync failed'
          };
        }
      })
    );

    const syncedCount = syncResults.filter(r => r.synced).length;
    const statusChanges = syncResults.filter(r => r.synced && 'status_changed' in r && r.status_changed).length;

    // Fetch updated domains
    const { data: updatedDomainsData } = await getSupabaseAdmin()
      .from('customer_domains')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const updatedDomains = updatedDomainsData as CustomerDomain[] | null;

    return NextResponse.json({
      success: true,
      data: (updatedDomains || []).map((d: CustomerDomain) => ({
        id: d.id,
        resend_domain_id: d.resend_domain_id,
        name: d.name,
        status: d.status,
        status_description: getDomainStatusDescription(d.status),
        region: d.region,
        dns_records: d.dns_records,
        is_primary: d.is_primary,
        verified_at: d.verified_at,
        last_checked_at: d.last_checked_at,
        created_at: d.created_at
      })),
      sync_results: syncResults,
      synced: syncedCount,
      status_changes: statusChanges,
      message: `Synced ${syncedCount} domain(s). ${statusChanges} status change(s) detected.`
    });

  } catch (error) {
    console.error('POST /api/v1/domains/sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
