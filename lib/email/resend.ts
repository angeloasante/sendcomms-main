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
}

export interface EmailResult {
  success: boolean;
  id: string | null;
  error: string | null;
}

// Send email wrapper
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  try {
    const {
      to,
      subject,
      html,
      text,
      from = 'SendComms <onboarding@resend.dev>',
      replyTo,
      cc,
      bcc,
      attachments,
      tags,
      headers
    } = params;

    // Validate
    if (!to || !subject) {
      throw new Error('Missing required fields: to, subject');
    }

    if (!html && !text) {
      throw new Error('Either html or text is required');
    }

    // Build email options - using any to handle Resend's complex union types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emailOptions: any = {
      from,
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
        error: result.error.message
      };
    }

    return {
      success: true,
      id: result.data?.id || null,
      error: null
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
export async function sendBatchEmails(emails: SendEmailParams[]) {
  if (emails.length > 100) {
    throw new Error('Batch limit is 100 emails per request');
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchEmails: any[] = emails.map(email => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailOpts: any = {
        from: email.from || 'SendComms <onboarding@resend.dev>',
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
        error: results.error.message
      };
    }

    return {
      success: true,
      data: results.data,
      error: null
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
