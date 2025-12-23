/**
 * Error Escalation System
 * 
 * Sends critical error alerts to administrators via:
 * - SMS (for immediate attention)
 * - Email (with full error details)
 * 
 * Uses providers directly (not through our API) to avoid recursion
 */

import { Resend } from 'resend';
import twilio from 'twilio';
import { ErrorSeverity, ErrorContext, ProviderError } from '@/lib/errors/handler';

// Admin notification settings
const ADMIN_PHONE = process.env.ADMIN_PHONE || '+447555834656';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'angeloasante958@gmail.com,travis@travisdevelops.com').split(',');
const ALERT_FROM_EMAIL = process.env.ALERT_FROM_EMAIL || 'alerts@sendcomms.com';

interface EscalationAlert {
  errorId: string;
  severity: ErrorSeverity;
  service: string;
  provider: string;
  errorMessage: string;
  context: ErrorContext;
  timestamp: string;
}

/**
 * Main escalation function - sends alerts to all channels
 */
export async function escalateError(
  context: ErrorContext,
  error: ProviderError,
  errorId: string
): Promise<void> {
  const alert: EscalationAlert = {
    errorId,
    severity: error.severity,
    service: context.service,
    provider: context.provider,
    errorMessage: error.message,
    context,
    timestamp: new Date().toISOString()
  };
  
  console.log(`[Escalation] Triggering alerts for error ${errorId}`);
  
  // Send to all escalation channels in parallel
  // Using allSettled so one failure doesn't block others
  const results = await Promise.allSettled([
    sendEscalationSMS(alert),
    sendEscalationEmail(alert)
  ]);
  
  // Log results
  results.forEach((result, index) => {
    const channel = index === 0 ? 'SMS' : 'Email';
    if (result.status === 'rejected') {
      console.error(`[Escalation ${channel} Failed]`, result.reason);
    } else {
      console.log(`[Escalation ${channel} Sent]`);
    }
  });
}

/**
 * Send SMS alert to admin
 * Uses Twilio directly to avoid recursion through our SMS API
 */
async function sendEscalationSMS(alert: EscalationAlert): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_NUMBER;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[Escalation SMS] Twilio not configured, skipping SMS alert');
    return;
  }
  
  const twilioClient = twilio(accountSid, authToken);
  const message = formatSMSAlert(alert);
  
  await twilioClient.messages.create({
    body: message,
    to: ADMIN_PHONE,
    from: fromNumber
  });
}

/**
 * Send detailed email alert to admins
 * Uses Resend directly to avoid recursion through our Email API
 */
async function sendEscalationEmail(alert: EscalationAlert): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn('[Escalation Email] Resend not configured, skipping email alert');
    return;
  }
  
  const resend = new Resend(apiKey);
  const { subject, html } = formatEmailAlert(alert);
  
  await resend.emails.send({
    from: ALERT_FROM_EMAIL,
    to: ADMIN_EMAILS,
    subject,
    html
  });
}

/**
 * Format SMS alert message (keep it short for SMS)
 */
function formatSMSAlert(alert: EscalationAlert): string {
  const severityEmoji = getSeverityEmoji(alert.severity);
  
  return `
${severityEmoji} ${alert.severity.toUpperCase()} ALERT

Service: ${alert.service}
Provider: ${alert.provider}
Error: ${alert.errorMessage.substring(0, 100)}

Customer: ${alert.context.customer_id.substring(0, 8)}...
Error ID: ${alert.errorId}

Check dashboard for details.
  `.trim();
}

/**
 * Format detailed HTML email alert
 */
function formatEmailAlert(alert: EscalationAlert): { subject: string; html: string } {
  const severityEmoji = getSeverityEmoji(alert.severity);
  const severityColor = getSeverityColor(alert.severity);
  
  const subject = `${severityEmoji} ${alert.severity.toUpperCase()}: ${alert.provider} Error - ${alert.service} Service`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SendComms Alert</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 700px;
      margin: 0 auto;
      padding: 20px;
    }
    .alert-header {
      background: ${severityColor.bg};
      border-left: 4px solid ${severityColor.border};
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 0 8px 8px 0;
    }
    .alert-header h1 {
      margin: 0 0 10px 0;
      font-size: 20px;
      color: ${severityColor.text};
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 15px;
    }
    .meta-item {
      background: rgba(0,0,0,0.05);
      padding: 10px 15px;
      border-radius: 6px;
    }
    .meta-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    .section {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .section h2 {
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #495057;
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 10px;
    }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }
    code {
      background: #e9ecef;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    .action-box {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 20px;
    }
    .action-box h3 {
      margin: 0 0 10px 0;
      color: #856404;
      font-size: 14px;
    }
    .action-box ol {
      margin: 0;
      padding-left: 20px;
      color: #856404;
    }
    .action-box li {
      margin-bottom: 5px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      font-size: 12px;
      color: #6c757d;
      text-align: center;
    }
    .error-id {
      font-family: monospace;
      background: #e9ecef;
      padding: 4px 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="alert-header">
    <h1>${severityEmoji} Provider Error Alert</h1>
    <p style="margin: 0; color: ${severityColor.text};">
      A <strong>${alert.severity}</strong> severity error has occurred and requires attention.
    </p>
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Service</div>
        <div class="meta-value">${alert.service.toUpperCase()}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Provider</div>
        <div class="meta-value">${alert.provider.toUpperCase()}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Time</div>
        <div class="meta-value">${new Date(alert.timestamp).toLocaleString()}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Error ID</div>
        <div class="meta-value"><code>${alert.errorId}</code></div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Error Details</h2>
    <p><strong>Message:</strong> ${escapeHtml(alert.errorMessage)}</p>
    <p><strong>Customer ID:</strong> <code>${alert.context.customer_id}</code></p>
    <p><strong>Transaction ID:</strong> <code>${alert.context.transaction_id || 'N/A'}</code></p>
  </div>

  <div class="section">
    <h2>Request Data</h2>
    <pre>${escapeHtml(JSON.stringify(sanitizeForEmail(alert.context.request), null, 2))}</pre>
  </div>

  <div class="section">
    <h2>Original Error</h2>
    <pre>${escapeHtml(JSON.stringify(sanitizeForEmail(alert.context.error), null, 2))}</pre>
  </div>

  <div class="action-box">
    <h3>⚡ Action Required</h3>
    <ol>
      <li>Check the <strong>${alert.provider}</strong> provider dashboard</li>
      <li>Verify account status, balance, and API credentials</li>
      <li>Fix the underlying issue</li>
      <li>Manually retry the failed transaction if needed</li>
      <li>Mark as resolved in the admin dashboard</li>
    </ol>
  </div>

  <div class="footer">
    <p>
      This alert was sent by SendComms Error Monitoring System<br>
      Error ID: <span class="error-id">${alert.errorId}</span>
    </p>
    <p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sendcomms.com'}/dashboard/errors/${alert.errorId}">
        View in Dashboard →
      </a>
    </p>
  </div>
</body>
</html>
  `;
  
  return { subject, html };
}

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: ErrorSeverity): string {
  const emojis: Record<ErrorSeverity, string> = {
    low: '📋',
    medium: '⚠️',
    high: '🔶',
    critical: '🚨'
  };
  return emojis[severity] || '⚠️';
}

/**
 * Get colors for severity level
 */
function getSeverityColor(severity: ErrorSeverity): { bg: string; border: string; text: string } {
  const colors: Record<ErrorSeverity, { bg: string; border: string; text: string }> = {
    low: { bg: '#d1ecf1', border: '#0c5460', text: '#0c5460' },
    medium: { bg: '#fff3cd', border: '#856404', text: '#856404' },
    high: { bg: '#ffe5d0', border: '#fd7e14', text: '#c45000' },
    critical: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' }
  };
  return colors[severity] || colors.medium;
}

/**
 * Escape HTML characters for safe display
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

/**
 * Sanitize data for email display (remove sensitive info)
 */
function sanitizeForEmail(data: unknown): unknown {
  if (!data) return data;
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForEmail(item));
  }
  
  const sensitiveKeys = ['password', 'api_key', 'apiKey', 'secret', 'token', 'auth', 'authorization', 'credit_card', 'card_number'];
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForEmail(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
