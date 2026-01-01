import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  getDomain, 
  verifyDomain, 
  updateDomain, 
  deleteDomain,
  getDomainStatusDescription,
  type TlsSetting,
  type DomainStatus,
  type DomainRegion,
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
 * GET /api/v1/domains/[domainId]
 * Get a single domain with full details and DNS records
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Optionally fetch fresh data from Resend if status is pending
    let freshData = null;
    if (['not_started', 'pending', 'temporary_failure'].includes(domain.status)) {
      const resendResult = await getDomain(domain.resend_domain_id);
      if (resendResult.success && resendResult.data) {
        freshData = resendResult.data;
        
        // Update local database if status changed
        if (freshData.status !== domain.status) {
          await getTable('customer_domains')
            .update({
              status: freshData.status,
              dns_records: freshData.records,
              last_checked_at: new Date().toISOString()
            })
            .eq('id', domainId);
        }
      }
    }

    // Get verification history
    const { data: verificationLogs } = await getSupabaseAdmin()
      .from('domain_verification_logs')
      .select('*')
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get email stats for this domain
    const { data: stats } = await getSupabaseAdmin()
      .from('domain_email_stats')
      .select('*')
      .eq('domain_id', domainId)
      .order('stat_date', { ascending: false })
      .limit(30);

    // Use fresh data if available
    const currentStatus = freshData?.status || domain.status;
    const currentRecords = freshData?.records || domain.dns_records;

    return NextResponse.json({
      success: true,
      data: {
        id: domain.id,
        resend_domain_id: domain.resend_domain_id,
        name: domain.name,
        status: currentStatus,
        status_description: getDomainStatusDescription(currentStatus),
        region: domain.region,
        custom_return_path: domain.custom_return_path,
        open_tracking: domain.open_tracking,
        click_tracking: domain.click_tracking,
        tls: domain.tls,
        sending_enabled: domain.sending_enabled,
        receiving_enabled: domain.receiving_enabled,
        dns_records: currentRecords,
        is_primary: domain.is_primary,
        verified_at: domain.verified_at,
        last_checked_at: domain.last_checked_at,
        created_at: domain.created_at,
        updated_at: domain.updated_at,
        verification_history: verificationLogs || [],
        stats: stats || []
      }
    });

  } catch (error) {
    console.error('GET /api/v1/domains/[domainId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/domains/[domainId]
 * Update domain settings
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Parse request body
    const body = await request.json();
    const { openTracking, clickTracking, tls, setPrimary } = body;

    // Update in Resend if tracking or TLS settings changed
    const hasResendUpdates = 
      openTracking !== undefined || 
      clickTracking !== undefined || 
      tls !== undefined;

    if (hasResendUpdates) {
      const resendResult = await updateDomain({
        domainId: domain.resend_domain_id,
        openTracking,
        clickTracking,
        tls: tls as TlsSetting
      });

      if (!resendResult.success) {
        return NextResponse.json(
          { error: resendResult.error || 'Failed to update domain settings' },
          { status: 400 }
        );
      }
    }

    // Build update payload for local database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbUpdates: any = {};
    if (openTracking !== undefined) dbUpdates.open_tracking = openTracking;
    if (clickTracking !== undefined) dbUpdates.click_tracking = clickTracking;
    if (tls !== undefined) dbUpdates.tls = tls;

    // Handle setPrimary separately
    if (setPrimary === true) {
      // Use database function to set primary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (getSupabaseAdmin().rpc as any)('set_primary_domain', {
        p_domain_id: domainId,
        p_customer_id: customer.id
      });
    }

    // Update local database
    if (Object.keys(dbUpdates).length > 0) {
      const { error: updateError } = await getTable('customer_domains')
        .update(dbUpdates)
        .eq('id', domainId);

      if (updateError) {
        console.error('Database update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to save settings' },
          { status: 500 }
        );
      }
    }

    // Get updated domain
    const { data: updatedDomainData } = await getSupabaseAdmin()
      .from('customer_domains')
      .select('*')
      .eq('id', domainId)
      .single();

    const updatedDomain = updatedDomainData as CustomerDomain | null;

    if (!updatedDomain) {
      return NextResponse.json({ error: 'Domain not found after update' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDomain.id,
        name: updatedDomain.name,
        status: updatedDomain.status,
        open_tracking: updatedDomain.open_tracking,
        click_tracking: updatedDomain.click_tracking,
        tls: updatedDomain.tls,
        is_primary: updatedDomain.is_primary,
        updated_at: updatedDomain.updated_at
      },
      message: 'Domain settings updated successfully'
    });

  } catch (error) {
    console.error('PATCH /api/v1/domains/[domainId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/domains/[domainId]
 * Delete a domain
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Prevent deletion of primary domain if there are other domains
    if (domain.is_primary) {
      const { count } = await getSupabaseAdmin()
        .from('customer_domains')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .eq('is_active', true)
        .neq('id', domainId);

      if ((count || 0) > 0) {
        return NextResponse.json(
          { error: 'Cannot delete primary domain. Please set another domain as primary first.' },
          { status: 400 }
        );
      }
    }

    // Delete from Resend
    const resendResult = await deleteDomain(domain.resend_domain_id);
    
    if (!resendResult.success) {
      // Log but don't fail - domain might already be deleted in Resend
      console.warn('Resend deletion warning:', resendResult.error);
    }

    // Soft delete in database (set is_active = false)
    const { error: deleteError } = await getTable('customer_domains')
      .update({ is_active: false })
      .eq('id', domainId);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete domain' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Domain ${domain.name} has been deleted`
    });

  } catch (error) {
    console.error('DELETE /api/v1/domains/[domainId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
