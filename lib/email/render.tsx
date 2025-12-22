import { render } from '@react-email/components';
import { WelcomeEmail } from './templates/welcome';
import { TransactionReceipt } from './templates/transaction-receipt';

// Render welcome email to HTML
export async function renderWelcomeEmail(name: string, apiKey: string): Promise<string> {
  return await render(<WelcomeEmail name={name} apiKey={apiKey} />);
}

// Render transaction receipt to HTML
export async function renderTransactionReceipt(props: {
  customerName: string;
  transactionId: string;
  type: 'email' | 'sms' | 'airtime' | 'data';
  amount: number;
  currency: string;
  description: string;
  date: string;
  status: 'success' | 'failed' | 'pending';
}): Promise<string> {
  return await render(<TransactionReceipt {...props} />);
}
