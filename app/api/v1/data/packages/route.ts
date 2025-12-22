import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  validateApiKey, 
  successResponse,
  errorResponse,
  logUsage
} from '@/lib/api-helpers';

// Datamart API Configuration (fallback if DB is empty)
const DATAMART_API_URL = process.env.DATAMART_API_URL || 'https://api.datamartgh.shop/api/developer';
const DATAMART_API_KEY = process.env.DATAMART_API_KEY;

// Database row type for data_packages
interface DataPackageRow {
  id: string;
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
  created_at: string;
  updated_at: string;
}

interface PricingSettingRow {
  id: string;
  service_type: string;
  default_margin_percent: number;
  min_margin_percent: number;
  max_margin_percent: number;
  is_active: boolean;
}

// Initialize Supabase admin client lazily
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabaseAdmin;
}

// GET /api/v1/data/packages - List available data packages with markup pricing
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    const customerId = keyData.customer_id;
    const apiKeyId = keyData.id;

    // Get optional network filter
    const { searchParams } = new URL(request.url);
    const networkFilter = searchParams.get('network')?.toLowerCase();

    const supabase = getSupabase();

    // Try to get packages from database first
    let query = supabase
      .from('data_packages')
      .select('*')
      .eq('in_stock', true)
      .order('capacity_gb', { ascending: true });

    if (networkFilter) {
      query = query.eq('network_code', networkFilter);
    }

    const { data: dbPackagesRaw, error: dbError } = await query;
    const dbPackages = dbPackagesRaw as DataPackageRow[] | null;

    // Log API usage
    await logUsage(customerId, apiKeyId, '/api/v1/data/packages', 'GET');

    // If we have packages in DB, use them
    if (dbPackages && dbPackages.length > 0) {
      // Group packages by network
      const packages: Record<string, Array<{
        network: string;
        network_code: string;
        capacity_gb: number;
        capacity_mb: number;
        price: { amount: number; currency: string };
        provider_price: { amount: number; currency: string };
        margin_percent: number;
        in_stock: boolean;
      }>> = {};

      for (const pkg of dbPackages) {
        if (!packages[pkg.network_code]) {
          packages[pkg.network_code] = [];
        }

        packages[pkg.network_code].push({
          network: pkg.network_display,
          network_code: pkg.network_code,
          capacity_gb: pkg.capacity_gb,
          capacity_mb: pkg.capacity_mb,
          price: {
            amount: pkg.our_price,
            currency: pkg.currency
          },
          provider_price: {
            amount: pkg.provider_price,
            currency: pkg.currency
          },
          margin_percent: pkg.margin_percent,
          in_stock: pkg.in_stock
        });
      }

      // If network filter was applied, return flat array
      if (networkFilter && packages[networkFilter]) {
        return successResponse({
          network: networkFilter,
          packages: packages[networkFilter],
          source: 'database'
        });
      }

      return successResponse({
        country: 'Ghana',
        country_code: 'GH',
        currency: 'GHS',
        networks: packages,
        source: 'database'
      });
    }

    // Fallback: Fetch from Datamart API directly (with default 15% markup)
    console.log('DB packages not found, fetching from Datamart...');

    if (!DATAMART_API_KEY) {
      return errorResponse('Data service not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    // Get margin setting
    const { data: marginSettingRaw } = await supabase
      .from('pricing_settings')
      .select('default_margin_percent')
      .eq('service_type', 'data')
      .single();
    const marginSetting = marginSettingRaw as Pick<PricingSettingRow, 'default_margin_percent'> | null;

    const marginPercent = marginSetting?.default_margin_percent || 15;

    let datamartData;
    try {
      const datamartResponse = await fetch(`${DATAMART_API_URL}/data-packages`, {
        method: 'GET',
        headers: {
          'X-API-Key': DATAMART_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      datamartData = await datamartResponse.json();
    } catch (fetchError) {
      return errorResponse('Failed to fetch data packages', 502, 'PROVIDER_ERROR');
    }

    if (datamartData.status !== 'success') {
      return errorResponse('Failed to fetch data packages', 502, 'PROVIDER_ERROR');
    }

    // Network mapping
    const NETWORK_DISPLAY: Record<string, { name: string; code: string }> = {
      'YELLO': { name: 'MTN Ghana', code: 'mtn' },
      'TELECEL': { name: 'Telecel (Vodafone)', code: 'telecel' },
      'AT_PREMIUM': { name: 'AirtelTigo', code: 'airteltigo' },
    };

    // Transform packages with markup
    const packages: Record<string, Array<{
      network: string;
      network_code: string;
      capacity_gb: number;
      capacity_mb: number;
      price: { amount: number; currency: string };
      provider_price: { amount: number; currency: string };
      margin_percent: number;
      in_stock: boolean;
    }>> = {};

    for (const [datamartNetwork, networkPackages] of Object.entries(datamartData.data)) {
      if (datamartNetwork === 'at') continue;
      
      const networkInfo = NETWORK_DISPLAY[datamartNetwork];
      if (!networkInfo) continue;
      if (networkFilter && networkInfo.code !== networkFilter) continue;

      const transformedPackages = (networkPackages as Array<{
        capacity: string;
        mb: string;
        price: string;
        network: string;
        inStock?: boolean;
      }>).map(pkg => {
        const providerPrice = parseFloat(pkg.price);
        const marginAmount = providerPrice * (marginPercent / 100);
        const ourPrice = Math.round((providerPrice + marginAmount) * 100) / 100;

        return {
          network: networkInfo.name,
          network_code: networkInfo.code,
          capacity_gb: parseInt(pkg.capacity),
          capacity_mb: parseInt(pkg.mb),
          price: {
            amount: ourPrice,
            currency: 'GHS'
          },
          provider_price: {
            amount: providerPrice,
            currency: 'GHS'
          },
          margin_percent: marginPercent,
          in_stock: pkg.inStock !== false
        };
      });

      packages[networkInfo.code] = transformedPackages;
    }

    if (networkFilter && packages[networkFilter]) {
      return successResponse({
        network: networkFilter,
        packages: packages[networkFilter],
        source: 'provider'
      });
    }

    return successResponse({
      country: 'Ghana',
      country_code: 'GH',
      currency: 'GHS',
      networks: packages,
      source: 'provider'
    });

  } catch (error) {
    console.error('Get packages error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
