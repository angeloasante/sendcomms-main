import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Datamart API Configuration
const DATAMART_API_URL = process.env.DATAMART_API_URL || 'https://api.datamartgh.shop/api/developer';
const DATAMART_API_KEY = process.env.DATAMART_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!DATAMART_API_KEY) {
      return NextResponse.json({ error: 'Datamart API key not configured' }, { status: 500 });
    }

    const supabase = createAdminClient();
    
    // Find all pending/processing data transactions from the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'data')
      .in('status', ['pending', 'sent', 'processing'])
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching pending transactions:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pending transactions' }, { status: 500 });
    }

    if (!pendingTransactions || pendingTransactions.length === 0) {
      return NextResponse.json({ 
        message: 'No pending data transactions to check',
        checked: 0,
        updated: 0 
      });
    }

    console.log(`Checking ${pendingTransactions.length} pending data transactions...`);

    // Fetch recent transactions from Datamart to check statuses
    const datamartResponse = await fetch(`${DATAMART_API_URL}/transactions?page=1&limit=100`, {
      headers: {
        'X-API-Key': DATAMART_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!datamartResponse.ok) {
      console.error('Failed to fetch Datamart transactions:', datamartResponse.status);
      return NextResponse.json({ error: 'Failed to fetch Datamart transactions' }, { status: 502 });
    }

    const datamartData = await datamartResponse.json();
    
    if (datamartData.status !== 'success') {
      console.error('Datamart API error:', datamartData);
      return NextResponse.json({ error: 'Datamart API error' }, { status: 502 });
    }

    const datamartTransactions = datamartData.data?.transactions || [];
    
    // Build a map of Datamart transactions by reference for quick lookup
    const datamartMap = new Map<string, any>();
    for (const tx of datamartTransactions) {
      if (tx.reference) {
        datamartMap.set(tx.reference, tx);
      }
      // Also map by related purchase info
      if (tx.relatedPurchase?._id) {
        datamartMap.set(tx.relatedPurchase._id, tx);
      }
    }

    let updated = 0;
    let delivered = 0;
    let failed = 0;

    // Check each pending transaction
    for (const transaction of pendingTransactions) {
      const providerRef = transaction.response_data?.transaction_reference;
      const purchaseId = transaction.response_data?.purchase_id || transaction.provider_id;
      const orderRef = transaction.response_data?.order_reference;

      // Try to find matching Datamart transaction
      let datamartTx = null;
      if (providerRef) datamartTx = datamartMap.get(providerRef);
      if (!datamartTx && purchaseId) datamartTx = datamartMap.get(purchaseId);

      if (datamartTx) {
        const datamartStatus = datamartTx.status?.toLowerCase();
        let newStatus = transaction.status;

        // Map Datamart status to our status
        if (datamartStatus === 'completed' || datamartStatus === 'success' || datamartStatus === 'delivered') {
          newStatus = 'delivered';
          delivered++;
        } else if (datamartStatus === 'failed' || datamartStatus === 'cancelled' || datamartStatus === 'refunded') {
          newStatus = 'failed';
          failed++;
        }

        // Update if status changed
        if (newStatus !== transaction.status) {
          const now = new Date().toISOString();
          
          // Update transactions table
          await supabase
            .from('transactions')
            .update({
              status: newStatus,
              delivered_at: newStatus === 'delivered' ? now : null,
              failed_at: newStatus === 'failed' ? now : null,
              response_data: {
                ...transaction.response_data,
                datamart_status: datamartStatus,
                checked_at: now
              }
            })
            .eq('id', transaction.id);

          // Update data_logs table if it exists
          await supabase
            .from('data_logs')
            .update({
              status: newStatus === 'delivered' ? 'successful' : newStatus,
              completed_at: newStatus === 'delivered' ? now : null,
              failed_at: newStatus === 'failed' ? now : null
            })
            .eq('transaction_id', transaction.id);

          updated++;
          console.log(`Updated transaction ${transaction.id}: ${transaction.status} -> ${newStatus}`);
        }
      }
    }

    const result = {
      message: 'Data transaction status check complete',
      checked: pendingTransactions.length,
      updated,
      delivered,
      failed,
      timestamp: new Date().toISOString()
    };

    console.log('Cron job result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support POST for Vercel cron
export async function POST(request: NextRequest) {
  return GET(request);
}
