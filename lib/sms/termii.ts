// lib/sms/termii.ts
// Termii SMS Provider Integration (Africa-focused)

interface TermiiResponse {
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

interface TermiiSendResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  balance?: number;
}

/**
 * Send SMS via Termii (Africa-optimized provider)
 */
export async function sendTermii(
  to: string,
  message: string,
  from?: string
): Promise<TermiiSendResult> {
  try {
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = from || process.env.TERMII_SENDER_ID || 'SendComms';

    if (!apiKey || apiKey === 'your_termii_api_key') {
      throw new Error('Africa SMS server temporarily unavailable. Please try again later or contact support@sendcomms.com');
    }

    // Remove + prefix if present (Termii expects number without +)
    const formattedTo = to.startsWith('+') ? to.substring(1) : to;

    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedTo,
        from: senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: apiKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Termii API error: ${response.status} - ${errorText}`);
    }

    const data: TermiiResponse = await response.json();

    return {
      success: true,
      messageId: data.message_id,
      status: 'sent',
      balance: data.balance,
    };
  } catch (error) {
    console.error('Termii send error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown Termii error';

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get Termii account balance
 */
export async function getTermiiBalance(): Promise<{ balance: number } | null> {
  try {
    const apiKey = process.env.TERMII_API_KEY;

    if (!apiKey || apiKey === 'your_termii_api_key') {
      return null;
    }

    const response = await fetch(
      `https://api.ng.termii.com/api/get-balance?api_key=${apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new Error(`Termii balance check failed: ${response.status}`);
    }

    const data = await response.json();
    return { balance: data.balance };
  } catch (error) {
    console.error('Termii balance check error:', error);
    return null;
  }
}

/**
 * Termii pricing (Africa-focused, cheaper than Twilio for Africa)
 */
export const TERMII_PRICING_REFERENCE = {
  'GH': 0.025, // Ghana
  'NG': 0.025, // Nigeria
  'KE': 0.025, // Kenya
  'ZA': 0.025, // South Africa
  'UG': 0.025, // Uganda
  'TZ': 0.025, // Tanzania
  'CI': 0.025, // Côte d'Ivoire
  'SN': 0.025, // Senegal
  'CM': 0.025, // Cameroon
  'DEFAULT': 0.025,
};
