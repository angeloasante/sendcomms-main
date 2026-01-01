import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Default from address when no custom domain is configured
const DEFAULT_FROM_NAME = 'SendComms';
const DEFAULT_FROM_EMAIL = 'info@sendcomms.com';
const DEFAULT_FROM = `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;

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

// Lazy-initialized Supabase admin client for domain lookups
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

/**
 * Get the customer's verified primary domain for sending emails
 * Returns the domain name if verified, null otherwise
 */
export async function getCustomerSendingDomain(customerId: string): Promise<{
  domain: string | null;
  fromEmail: string;
  fromName: string;
}> {
  try {
    // Get the customer's primary verified domain
    const { data: primaryDomain, error } = await getTable('customer_domains')
      .select('name, status, is_primary')
      .eq('customer_id', customerId)
      .eq('is_active', true)
      .eq('status', 'verified')
      .eq('is_primary', true)
      .single();

    if (error || !primaryDomain) {
      // Try to get any verified domain if no primary
      const { data: anyVerifiedDomain } = await getTable('customer_domains')
        .select('name, status')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .eq('status', 'verified')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (anyVerifiedDomain) {
        return {
          domain: anyVerifiedDomain.name,
          fromEmail: `noreply@${anyVerifiedDomain.name}`,
          fromName: 'SendComms'
        };
      }

      // No verified domain, use default
      return {
        domain: null,
        fromEmail: DEFAULT_FROM_EMAIL,
        fromName: DEFAULT_FROM_NAME
      };
    }

    return {
      domain: primaryDomain.name,
      fromEmail: `noreply@${primaryDomain.name}`,
      fromName: 'SendComms'
    };
  } catch (err) {
    console.error('Error getting customer sending domain:', err);
    return {
      domain: null,
      fromEmail: DEFAULT_FROM_EMAIL,
      fromName: DEFAULT_FROM_NAME
    };
  }
}

/**
 * Build the 'from' address for an email
 * Priority:
 * 1. Explicitly provided 'from' address (if uses customer's verified domain)
 * 2. Customer's verified primary domain
 * 3. Default SendComms address
 */
export async function buildFromAddress(
  customerId: string | null,
  providedFrom?: string
): Promise<string> {
  // If no customer ID, use default
  if (!customerId) {
    return providedFrom || DEFAULT_FROM;
  }

  // Get customer's sending domain
  const customerDomain = await getCustomerSendingDomain(customerId);

  // If a 'from' address was provided
  if (providedFrom) {
    // Extract domain from provided 'from' address
    const emailMatch = providedFrom.match(/<(.+?)>$/) || [null, providedFrom];
    const providedEmail = emailMatch[1] || providedFrom;
    const providedDomainMatch = providedEmail.match(/@(.+)$/);
    const providedDomain = providedDomainMatch ? providedDomainMatch[1] : null;

    // If the provided domain matches customer's verified domain, allow it
    if (providedDomain && customerDomain.domain && 
        providedDomain.toLowerCase() === customerDomain.domain.toLowerCase()) {
      return providedFrom;
    }

    // Check if the provided domain is any of customer's verified domains
    if (providedDomain) {
      const { data: verifiedDomain } = await getTable('customer_domains')
        .select('name')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .eq('status', 'verified')
        .ilike('name', providedDomain)
        .single();

      if (verifiedDomain) {
        return providedFrom;
      }
    }

    // Provided domain not verified - fall through to use customer's domain or default
    console.warn(`Provided from domain "${providedDomain}" is not verified for customer ${customerId}`);
  }

  // Use customer's verified domain or default
  if (customerDomain.domain) {
    return `${customerDomain.fromName} <${customerDomain.fromEmail}>`;
  }

  return DEFAULT_FROM;
}

// For backwards compatibility
export const resend = {
  get emails() {
    return getResendClient().emails;
  },
  get batch() {
    return getResendClient().batch;
  }
};

// Email types
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
  tags?: Array<{
    name: string;
    value: string;
  }>;
  headers?: Record<string, string>;
  /** Customer ID for domain lookup - if provided, will use customer's verified domain */
  customerId?: string;
}

export interface EmailResult {
  success: boolean;
  id: string | null;
  error: string | null;
  /** The actual 'from' address used */
  fromAddress?: string;
}

// Send email wrapper
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  try {
    const {
      to,
      subject,
      html,
      text,
      from,
      replyTo,
      cc,
      bcc,
      attachments,
      tags,
      headers,
      customerId
    } = params;

    // Validate
    if (!to || !subject) {
      throw new Error('Missing required fields: to, subject');
    }

    if (!html && !text) {
      throw new Error('Either html or text is required');
    }

    // Build the 'from' address - uses customer's verified domain if available
    const fromAddress = await buildFromAddress(customerId || null, from);

    // Build email options - using any to handle Resend's complex union types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emailOptions: any = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      replyTo,
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      attachments,
      tags,
      headers
    };

    // Add content - must have either html or text
    if (html) {
      emailOptions.html = html;
    }
    if (text) {
      emailOptions.text = text;
    }

    // Send via Resend
    const result = await resend.emails.send(emailOptions);

    if (result.error) {
      return {
        success: false,
        id: null,
        error: result.error.message,
        fromAddress
      };
    }

    return {
      success: true,
      id: result.data?.id || null,
      error: null,
      fromAddress
    };

  } catch (error: unknown) {
    console.error('Resend error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    
    return {
      success: false,
      id: null,
      error: errorMessage
    };
  }
}

// Batch send (up to 100 emails per request)
export async function sendBatchEmails(
  emails: SendEmailParams[],
  customerId?: string
): Promise<{
  success: boolean;
  data: unknown;
  error: string | null;
  fromAddress?: string;
}> {
  if (emails.length > 100) {
    throw new Error('Batch limit is 100 emails per request');
  }

  try {
    // Get the 'from' address for this batch (all emails use the same from address in batch)
    const fromAddress = await buildFromAddress(customerId || null, emails[0]?.from);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchEmails: any[] = emails.map(email => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailOpts: any = {
        from: fromAddress,
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
        tags: email.tags
      };
      
      if (email.html) {
        emailOpts.html = email.html;
      }
      if (email.text) {
        emailOpts.text = email.text;
      }
      
      return emailOpts;
    });

    const results = await resend.batch.send(batchEmails);

    if (results.error) {
      return {
        success: false,
        data: null,
        error: results.error.message,
        fromAddress
      };
    }

    return {
      success: true,
      data: results.data,
      error: null,
      fromAddress
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Batch send failed';
    return {
      success: false,
      data: null,
      error: errorMessage
    };
  }
}

// Get email status
export async function getEmailStatus(emailId: string) {
  try {
    const email = await resend.emails.get(emailId);
    return email;
  } catch (error) {
    console.error('Failed to get email status:', error);
    return null;
  }
}
