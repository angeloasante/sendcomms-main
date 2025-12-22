import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { successResponse, errorResponse } from '@/lib/api-helpers';

// Datamart API Configuration
const DATAMART_API_URL = process.env.DATAMART_API_URL || 'https://api.datamartgh.shop/api/developer';
const DATAMART_API_KEY = process.env.DATAMART_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

// Network mapping
const NETWORK_MAPPING: Record<string, { display: string; code: string }> = {
  'YELLO': { display: 'MTN Ghana', code: 'mtn' },
  'TELECEL': { display: 'Telecel (Vodafone)', code: 'telecel' },
  'AT_PREMIUM': { display: 'AirtelTigo', code: 'airteltigo' },
};

interface DatamartPackage {
  capacity: string;
  mb: string;
  price: string;
  network: string;
  inStock?: boolean;
}

// POST /api/v1/cron/sync-data-prices - Sync data package prices from Datamart
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (for Vercel cron or manual triggers)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = authHeader?.replace('Bearer ', '');
    
    // Allow if cron secret matches OR if called from internal API
    const isAuthorized = 
      cronSecret === CRON_SECRET || 
      request.headers.get('x-internal-call') === 'true';

    if (!isAuthorized && CRON_SECRET) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!DATAMART_API_KEY) {
      return errorResponse('Datamart API key not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    // Initialize Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get current margin setting
    const { data: marginSetting } = await supabase
      .from('pricing_settings')
      .select('default_margin_percent')
      .eq('service_type', 'data')
      .single();

    const marginPercent = marginSetting?.default_margin_percent || 15;

    // Fetch packages from Datamart
    console.log('Fetching data packages from Datamart...');
    
    const datamartResponse = await fetch(`${DATAMART_API_URL}/data-packages`, {
      method: 'GET',
      headers: {
        'X-API-Key': DATAMART_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const datamartData = await datamartResponse.json();

    if (datamartData.status !== 'success') {
      console.error('Datamart API error:', datamartData);
      return errorResponse('Failed to fetch packages from provider', 502, 'PROVIDER_ERROR');
    }

    // Process and upsert packages
    const packagesToUpsert: Array<{
      provider: string;
      country: string;
      country_code: string;
      network: string;
      network_code: string;
      network_display: string;
      capacity_gb: number;
      capacity_mb: number;
      provider_price: number;
      our_price: number;
      margin_percent: number;
      margin_amount: number;
      currency: string;
      in_stock: boolean;
      last_synced_at: string;
    }> = [];

    let totalPackages = 0;
    let updatedPackages = 0;

    for (const [datamartNetwork, packages] of Object.entries(datamartData.data)) {
      // Skip 'at' as it's a duplicate of AT_PREMIUM
      if (datamartNetwork === 'at') continue;

      const networkInfo = NETWORK_MAPPING[datamartNetwork];
      if (!networkInfo) {
        console.warn(`Unknown network: ${datamartNetwork}`);
        continue;
      }

      for (const pkg of packages as DatamartPackage[]) {
        const providerPrice = parseFloat(pkg.price);
        const marginAmount = providerPrice * (marginPercent / 100);
        const ourPrice = Math.round((providerPrice + marginAmount) * 100) / 100; // Round to 2 decimals

        packagesToUpsert.push({
          provider: 'datamart',
          country: 'Ghana',
          country_code: 'GH',
          network: datamartNetwork,
          network_code: networkInfo.code,
          network_display: networkInfo.display,
          capacity_gb: parseInt(pkg.capacity),
          capacity_mb: parseInt(pkg.mb),
          provider_price: providerPrice,
          our_price: ourPrice,
          margin_percent: marginPercent,
          margin_amount: Math.round(marginAmount * 100) / 100,
          currency: 'GHS',
          in_stock: pkg.inStock !== false,
          last_synced_at: new Date().toISOString()
        });

        totalPackages++;
      }
    }

    // Upsert all packages
    if (packagesToUpsert.length > 0) {
      const { error: upsertError, count } = await supabase
        .from('data_packages')
        .upsert(packagesToUpsert, {
          onConflict: 'provider,network_code,capacity_gb',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return errorResponse('Failed to update packages in database', 500, 'DATABASE_ERROR');
      }

      updatedPackages = count || packagesToUpsert.length;
    }

    console.log(`Synced ${updatedPackages} packages from Datamart`);

    return successResponse({
      message: 'Data packages synced successfully',
      total_packages: totalPackages,
      updated_packages: updatedPackages,
      margin_percent: marginPercent,
      networks: Object.keys(NETWORK_MAPPING).filter(n => n !== 'at'),
      synced_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// GET /api/v1/cron/sync-data-prices - Get sync status
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('Authorization');
    const cronSecret = authHeader?.replace('Bearer ', '');
    
    if (cronSecret !== CRON_SECRET && CRON_SECRET) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get last sync time and package counts
    const { data: packages, error } = await supabase
      .from('data_packages')
      .select('network_code, last_synced_at')
      .order('last_synced_at', { ascending: false });

    if (error) {
      return errorResponse('Failed to fetch sync status', 500, 'DATABASE_ERROR');
    }

    const lastSyncedAt = packages?.[0]?.last_synced_at || null;
    
    // Count packages by network
    const networkCounts: Record<string, number> = {};
    for (const pkg of packages || []) {
      networkCounts[pkg.network_code] = (networkCounts[pkg.network_code] || 0) + 1;
    }

    // Get margin setting
    const { data: marginSetting } = await supabase
      .from('pricing_settings')
      .select('*')
      .eq('service_type', 'data')
      .single();

    return successResponse({
      last_synced_at: lastSyncedAt,
      total_packages: packages?.length || 0,
      packages_by_network: networkCounts,
      margin_settings: marginSetting
    });

  } catch (error) {
    console.error('Status error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
