// Reloadly API integration for airtime and data purchases

const RELOADLY_API_URL = process.env.RELOADLY_API_URL || 'https://topups.reloadly.com';
const RELOADLY_CLIENT_ID = process.env.RELOADLY_CLIENT_ID;
const RELOADLY_CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET;

interface ReloadlyTokenResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

interface ReloadlyOperator {
  id: number;
  name: string;
  countryCode: string;
  minAmount: number;
  maxAmount: number;
}

interface ReloadlyTopupResponse {
  transactionId: number;
  operatorTransactionId: string;
  status: string;
  recipientPhone: string;
  requestedAmount: number;
  deliveredAmount: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

// Get access token from Reloadly
export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch('https://auth.reloadly.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: RELOADLY_CLIENT_ID,
      client_secret: RELOADLY_CLIENT_SECRET,
      grant_type: 'client_credentials',
      audience: RELOADLY_API_URL,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get Reloadly access token');
  }

  const data: ReloadlyTokenResponse = await response.json();
  
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000) - 60000, // Subtract 1 minute for safety
  };

  return cachedToken.token;
}

// Get operators for a specific country
export async function getOperators(countryCode: string): Promise<ReloadlyOperator[]> {
  const token = await getAccessToken();

  const response = await fetch(`${RELOADLY_API_URL}/operators/countries/${countryCode}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/com.reloadly.topups-v1+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get operators');
  }

  return response.json();
}

// Purchase airtime
export async function purchaseAirtime(
  operatorId: number,
  amount: number,
  recipientPhone: string,
  countryCode: string
): Promise<ReloadlyTopupResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${RELOADLY_API_URL}/topups`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/com.reloadly.topups-v1+json',
    },
    body: JSON.stringify({
      operatorId,
      amount,
      useLocalAmount: false,
      recipientPhone: {
        countryCode,
        number: recipientPhone,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to purchase airtime');
  }

  return response.json();
}

// Get data bundles for an operator
export async function getDataBundles(operatorId: number) {
  const token = await getAccessToken();

  const response = await fetch(`${RELOADLY_API_URL}/operators/${operatorId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/com.reloadly.topups-v1+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get data bundles');
  }

  const operator = await response.json();
  return operator.fixedAmounts || [];
}

// Purchase data bundle
export async function purchaseData(
  operatorId: number,
  amount: number,
  recipientPhone: string,
  countryCode: string
): Promise<ReloadlyTopupResponse> {
  // Data bundles are purchased the same way as airtime in Reloadly
  return purchaseAirtime(operatorId, amount, recipientPhone, countryCode);
}
