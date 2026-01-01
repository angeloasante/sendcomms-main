import { Resend } from 'resend';

// Lazy initialization to handle build time
let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

// ============================================
// Domain Types (matching Resend API responses)
// ============================================

export type DomainStatus = 
  | 'not_started' 
  | 'pending' 
  | 'verified' 
  | 'failed' 
  | 'temporary_failure';

export type DomainRegion = 
  | 'us-east-1' 
  | 'eu-west-1' 
  | 'sa-east-1' 
  | 'ap-northeast-1';

export type TlsSetting = 'opportunistic' | 'enforced';

export type CapabilityStatus = 'enabled' | 'disabled';

export interface DomainCapabilities {
  sending: CapabilityStatus;
  receiving: CapabilityStatus;
}

export interface DnsRecord {
  record: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
  name: string;
  type: 'TXT' | 'CNAME' | 'MX';
  ttl: string;
  status: DomainStatus;
  value: string;
  priority?: number;
}

export interface Domain {
  id: string;
  name: string;
  status: DomainStatus;
  created_at: string;
  region: DomainRegion;
  capabilities: DomainCapabilities;
  records?: DnsRecord[];
}

export interface DomainWithRecords extends Domain {
  records: DnsRecord[];
}

// ============================================
// Create Domain
// ============================================

export interface CreateDomainParams {
  name: string;
  region?: DomainRegion;
  customReturnPath?: string;
  openTracking?: boolean;
  clickTracking?: boolean;
  tls?: TlsSetting;
  capabilities?: {
    sending?: CapabilityStatus;
    receiving?: CapabilityStatus;
  };
}

export interface CreateDomainResult {
  success: boolean;
  data: DomainWithRecords | null;
  error: string | null;
}

/**
 * Create a new domain in Resend
 * 
 * @param params - Domain creation parameters
 * @returns Created domain with DNS records to configure
 */
export async function createDomain(params: CreateDomainParams): Promise<CreateDomainResult> {
  try {
    const { name, region, customReturnPath, openTracking, clickTracking, tls, capabilities } = params;

    // Validate domain name
    if (!name || !isValidDomainName(name)) {
      return {
        success: false,
        data: null,
        error: 'Invalid domain name. Please provide a valid domain (e.g., example.com)'
      };
    }

    // Validate custom return path if provided
    if (customReturnPath && !isValidReturnPath(customReturnPath)) {
      return {
        success: false,
        data: null,
        error: 'Custom return path must be 63 characters or less, start with a letter, end with a letter or number, and contain only letters, numbers, and hyphens'
      };
    }

    const client = getResendClient();
    
    // Build request payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createParams: any = { name };

    if (region) createParams.region = region;
    if (customReturnPath) createParams.customReturnPath = customReturnPath;
    if (openTracking !== undefined) createParams.openTracking = openTracking;
    if (clickTracking !== undefined) createParams.clickTracking = clickTracking;
    if (tls) createParams.tls = tls;
    if (capabilities) createParams.capabilities = capabilities;

    const { data, error } = await client.domains.create(createParams);

    if (error) {
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to create domain'
      };
    }

    return {
      success: true,
      data: data as unknown as DomainWithRecords,
      error: null
    };

  } catch (error: unknown) {
    console.error('Create domain error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create domain';
    return {
      success: false,
      data: null,
      error: errorMessage
    };
  }
}

// ============================================
// Verify Domain
// ============================================

export interface VerifyDomainResult {
  success: boolean;
  domainId: string | null;
  error: string | null;
}

/**
 * Trigger DNS verification for a domain
 * 
 * @param domainId - The Resend domain ID
 * @returns Verification result
 */
export async function verifyDomain(domainId: string): Promise<VerifyDomainResult> {
  try {
    if (!domainId) {
      return {
        success: false,
        domainId: null,
        error: 'Domain ID is required'
      };
    }

    const client = getResendClient();
    const { data, error } = await client.domains.verify(domainId);

    if (error) {
      return {
        success: false,
        domainId: null,
        error: error.message || 'Failed to verify domain'
      };
    }

    return {
      success: true,
      domainId: data?.id || domainId,
      error: null
    };

  } catch (error: unknown) {
    console.error('Verify domain error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to verify domain';
    return {
      success: false,
      domainId: null,
      error: errorMessage
    };
  }
}

// ============================================
// Get Domain
// ============================================

export interface GetDomainResult {
  success: boolean;
  data: DomainWithRecords | null;
  error: string | null;
}

/**
 * Retrieve a single domain with its DNS records
 * 
 * @param domainId - The Resend domain ID
 * @returns Domain details with DNS records
 */
export async function getDomain(domainId: string): Promise<GetDomainResult> {
  try {
    if (!domainId) {
      return {
        success: false,
        data: null,
        error: 'Domain ID is required'
      };
    }

    const client = getResendClient();
    const { data, error } = await client.domains.get(domainId);

    if (error) {
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to retrieve domain'
      };
    }

    return {
      success: true,
      data: data as unknown as DomainWithRecords,
      error: null
    };

  } catch (error: unknown) {
    console.error('Get domain error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve domain';
    return {
      success: false,
      data: null,
      error: errorMessage
    };
  }
}

// ============================================
// List Domains
// ============================================

export interface ListDomainsParams {
  limit?: number;
  after?: string;
  before?: string;
}

export interface ListDomainsResult {
  success: boolean;
  data: Domain[] | null;
  hasMore: boolean;
  error: string | null;
}

/**
 * List all domains for the account
 * 
 * @param params - Pagination parameters
 * @returns List of domains
 */
export async function listDomains(params: ListDomainsParams = {}): Promise<ListDomainsResult> {
  try {
    const { limit, after, before } = params;

    // Validate pagination params
    if (limit !== undefined && (limit < 1 || limit > 100)) {
      return {
        success: false,
        data: null,
        hasMore: false,
        error: 'Limit must be between 1 and 100'
      };
    }

    if (after && before) {
      return {
        success: false,
        data: null,
        hasMore: false,
        error: 'Cannot use both after and before parameters'
      };
    }

    const client = getResendClient();
    
    // Build query params - Resend SDK may not support all params directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryParams: any = {};
    if (limit) queryParams.limit = limit;
    if (after) queryParams.after = after;
    if (before) queryParams.before = before;

    const { data, error } = await client.domains.list();

    if (error) {
      return {
        success: false,
        data: null,
        hasMore: false,
        error: error.message || 'Failed to list domains'
      };
    }

    // Handle both array and object responses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = data as any;
    const domains = Array.isArray(responseData) 
      ? responseData 
      : (responseData?.data || []);
    const hasMore = responseData?.has_more || false;

    return {
      success: true,
      data: domains as Domain[],
      hasMore,
      error: null
    };

  } catch (error: unknown) {
    console.error('List domains error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to list domains';
    return {
      success: false,
      data: null,
      hasMore: false,
      error: errorMessage
    };
  }
}

// ============================================
// Update Domain
// ============================================

export interface UpdateDomainParams {
  domainId: string;
  openTracking?: boolean;
  clickTracking?: boolean;
  tls?: TlsSetting;
  capabilities?: {
    sending?: CapabilityStatus;
    receiving?: CapabilityStatus;
  };
}

export interface UpdateDomainResult {
  success: boolean;
  domainId: string | null;
  error: string | null;
}

/**
 * Update domain settings
 * 
 * @param params - Domain update parameters
 * @returns Update result
 */
export async function updateDomain(params: UpdateDomainParams): Promise<UpdateDomainResult> {
  try {
    const { domainId, openTracking, clickTracking, tls, capabilities } = params;

    if (!domainId) {
      return {
        success: false,
        domainId: null,
        error: 'Domain ID is required'
      };
    }

    const client = getResendClient();

    // Build update payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateParams: any = { id: domainId };

    if (openTracking !== undefined) updateParams.openTracking = openTracking;
    if (clickTracking !== undefined) updateParams.clickTracking = clickTracking;
    if (tls) updateParams.tls = tls;
    if (capabilities) updateParams.capabilities = capabilities;

    const { data, error } = await client.domains.update(updateParams);

    if (error) {
      return {
        success: false,
        domainId: null,
        error: error.message || 'Failed to update domain'
      };
    }

    return {
      success: true,
      domainId: data?.id || domainId,
      error: null
    };

  } catch (error: unknown) {
    console.error('Update domain error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update domain';
    return {
      success: false,
      domainId: null,
      error: errorMessage
    };
  }
}

// ============================================
// Delete Domain
// ============================================

export interface DeleteDomainResult {
  success: boolean;
  domainId: string | null;
  error: string | null;
}

/**
 * Remove a domain from Resend
 * 
 * @param domainId - The Resend domain ID
 * @returns Deletion result
 */
export async function deleteDomain(domainId: string): Promise<DeleteDomainResult> {
  try {
    if (!domainId) {
      return {
        success: false,
        domainId: null,
        error: 'Domain ID is required'
      };
    }

    const client = getResendClient();
    const { data, error } = await client.domains.remove(domainId);

    if (error) {
      return {
        success: false,
        domainId: null,
        error: error.message || 'Failed to delete domain'
      };
    }

    return {
      success: true,
      domainId: data?.id || domainId,
      error: null
    };

  } catch (error: unknown) {
    console.error('Delete domain error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete domain';
    return {
      success: false,
      domainId: null,
      error: errorMessage
    };
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Validate domain name format
 */
function isValidDomainName(domain: string): boolean {
  // Basic domain validation regex
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Validate custom return path format
 * Must be 63 characters or less, start with a letter, 
 * end with a letter or number, contain only letters, numbers, and hyphens
 */
function isValidReturnPath(path: string): boolean {
  if (path.length > 63) return false;
  const returnPathRegex = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z]$/;
  return returnPathRegex.test(path);
}

/**
 * Get human-readable status description
 */
export function getDomainStatusDescription(status: DomainStatus): string {
  const descriptions: Record<DomainStatus, string> = {
    'not_started': 'DNS records have not been verified yet. Add the DNS records and click Verify.',
    'pending': 'Verification in progress. DNS propagation can take up to 72 hours.',
    'verified': 'Domain is verified and ready to send emails.',
    'failed': 'Verification failed. DNS records were not detected within 72 hours.',
    'temporary_failure': 'DNS records temporarily not detected. Will retry verification for 72 hours.'
  };
  return descriptions[status] || 'Unknown status';
}

/**
 * Get status badge color for UI
 */
export function getDomainStatusColor(status: DomainStatus): string {
  const colors: Record<DomainStatus, string> = {
    'not_started': 'gray',
    'pending': 'amber',
    'verified': 'emerald',
    'failed': 'red',
    'temporary_failure': 'orange'
  };
  return colors[status] || 'gray';
}

/**
 * Check if domain can send emails
 */
export function canDomainSendEmails(domain: Domain): boolean {
  return domain.status === 'verified' && domain.capabilities.sending === 'enabled';
}

/**
 * Get regional endpoint description
 */
export function getRegionDescription(region: DomainRegion): string {
  const descriptions: Record<DomainRegion, string> = {
    'us-east-1': 'US East (N. Virginia)',
    'eu-west-1': 'EU West (Ireland)',
    'sa-east-1': 'South America (São Paulo)',
    'ap-northeast-1': 'Asia Pacific (Tokyo)'
  };
  return descriptions[region] || region;
}

/**
 * Group DNS records by type for easier display
 */
export function groupDnsRecords(records: DnsRecord[]): {
  spf: DnsRecord[];
  dkim: DnsRecord[];
  dmarc: DnsRecord[];
  mx: DnsRecord[];
} {
  return {
    spf: records.filter(r => r.record === 'SPF'),
    dkim: records.filter(r => r.record === 'DKIM'),
    dmarc: records.filter(r => r.record === 'DMARC'),
    mx: records.filter(r => r.record === 'MX')
  };
}

/**
 * Check if all required DNS records are verified
 */
export function areAllRecordsVerified(records: DnsRecord[]): boolean {
  const requiredRecords = records.filter(r => r.record === 'SPF' || r.record === 'DKIM');
  return requiredRecords.length > 0 && requiredRecords.every(r => r.status === 'verified');
}
