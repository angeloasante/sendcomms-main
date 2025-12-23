/**
 * Sandbox Transaction Logger
 * 
 * Logs test transactions to the database for debugging and testing purposes.
 * Test transactions are stored separately and don't affect real usage stats.
 */

import { createAdminClient } from '@/lib/supabase/server';

export interface TestTransactionLog {
  customer_id: string;
  api_key_id?: string;
  service: 'sms' | 'email' | 'data' | 'airtime';
  endpoint: string;
  request_body: Record<string, unknown>;
  response_body: Record<string, unknown>;
  transaction_id: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log a test/sandbox transaction
 */
export async function logTestTransaction(log: TestTransactionLog): Promise<void> {
  try {
    const supabase = createAdminClient();
    
    await supabase.from('test_transactions').insert({
      customer_id: log.customer_id,
      api_key_id: log.api_key_id,
      service: log.service,
      endpoint: log.endpoint,
      request_body: log.request_body,
      response_body: log.response_body,
      transaction_id: log.transaction_id,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    // Don't let logging failures affect the API response
    console.error('[Test Transaction Log Failed]', error);
  }
}

/**
 * Get test transactions for a customer
 */
export async function getTestTransactions(
  customerId: string,
  options: {
    service?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const supabase = createAdminClient();
  const { service, limit = 50, offset = 0 } = options;
  
  let query = supabase
    .from('test_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (service) {
    query = query.eq('service', service);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[Get Test Transactions Failed]', error);
    return [];
  }
  
  return data;
}

/**
 * Get test transaction count for a customer
 */
export async function getTestTransactionCount(
  customerId: string,
  service?: string
): Promise<number> {
  const supabase = createAdminClient();
  
  let query = supabase
    .from('test_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId);
  
  if (service) {
    query = query.eq('service', service);
  }
  
  const { count, error } = await query;
  
  if (error) {
    console.error('[Get Test Transaction Count Failed]', error);
    return 0;
  }
  
  return count || 0;
}
