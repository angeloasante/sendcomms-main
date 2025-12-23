// lib/sms/twilio.ts
// Twilio SMS Provider Integration

import twilio from 'twilio';

interface TwilioSendResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  segments?: number;
}

// Lazy-initialized Twilio client
let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

/**
 * Send SMS via Twilio
 */
export async function sendTwilio(
  to: string,
  message: string,
  from?: string
): Promise<TwilioSendResult> {
  try {
    const client = getTwilioClient();
    const fromNumber = from || process.env.TWILIO_NUMBER;

    if (!fromNumber) {
      throw new Error('Twilio phone number not configured');
    }

    // Ensure phone number has + prefix
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    const formattedFrom = fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`;

    const twilioMessage = await client.messages.create({
      body: message,
      to: formattedTo,
      from: formattedFrom.trim(),
    });

    // Calculate number of segments (SMS are 160 chars, or 70 for unicode)
    const hasUnicode = /[^\x00-\x7F]/.test(message);
    const maxCharsPerSegment = hasUnicode ? 70 : 160;
    const segments = Math.ceil(message.length / maxCharsPerSegment);

    return {
      success: true,
      messageId: twilioMessage.sid,
      status: twilioMessage.status,
      segments,
    };
  } catch (error) {
    console.error('Twilio send error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown Twilio error';
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get Twilio message status
 */
export async function getTwilioMessageStatus(messageSid: string): Promise<{
  status: string;
  errorCode?: number;
  errorMessage?: string;
}> {
  try {
    const client = getTwilioClient();
    const message = await client.messages(messageSid).fetch();

    return {
      status: message.status,
      errorCode: message.errorCode || undefined,
      errorMessage: message.errorMessage || undefined,
    };
  } catch (error) {
    console.error('Twilio status check error:', error);
    throw error;
  }
}

/**
 * Twilio pricing lookup (for reference)
 * Note: Actual pricing should come from database
 */
export const TWILIO_PRICING_REFERENCE = {
  'US': 0.0079,
  'CA': 0.0079,
  'GB': 0.0400,
  'GH': 0.0531,
  'NG': 0.0450,
  'KE': 0.0380,
  'ZA': 0.0280,
  'DEFAULT': 0.0500,
};
