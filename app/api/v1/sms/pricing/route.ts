import { NextRequest, NextResponse } from 'next/server';
import {
  validateApiKey,
  errorResponse,
} from '@/lib/api-helpers';
import {
  getSMSPricing,
  detectContinent,
  extractCountryCode,
  COUNTRY_NAMES,
  AFRICAN_COUNTRY_CODES,
  Continent,
} from '@/lib/sms/router';

// Comprehensive SMS pricing table (provider info kept internal)
const SMS_PRICING_TABLE = [
  // Africa
  { country_code: '233', country_name: 'Ghana', cost: 0.025, region: 'africa' },
  { country_code: '234', country_name: 'Nigeria', cost: 0.025, region: 'africa' },
  { country_code: '254', country_name: 'Kenya', cost: 0.025, region: 'africa' },
  { country_code: '27', country_name: 'South Africa', cost: 0.025, region: 'africa' },
  { country_code: '256', country_name: 'Uganda', cost: 0.025, region: 'africa' },
  { country_code: '255', country_name: 'Tanzania', cost: 0.025, region: 'africa' },
  { country_code: '237', country_name: 'Cameroon', cost: 0.025, region: 'africa' },
  { country_code: '225', country_name: 'Côte d\'Ivoire', cost: 0.025, region: 'africa' },
  { country_code: '221', country_name: 'Senegal', cost: 0.025, region: 'africa' },
  { country_code: '220', country_name: 'Gambia', cost: 0.025, region: 'africa' },

  // North America
  { country_code: '1', country_name: 'United States / Canada', cost: 0.0079, region: 'north_america' },

  // Europe
  { country_code: '44', country_name: 'United Kingdom', cost: 0.0400, region: 'europe' },
  { country_code: '49', country_name: 'Germany', cost: 0.0550, region: 'europe' },
  { country_code: '33', country_name: 'France', cost: 0.0650, region: 'europe' },
  { country_code: '34', country_name: 'Spain', cost: 0.0700, region: 'europe' },
  { country_code: '39', country_name: 'Italy', cost: 0.0600, region: 'europe' },
  { country_code: '31', country_name: 'Netherlands', cost: 0.0750, region: 'europe' },

  // Asia
  { country_code: '91', country_name: 'India', cost: 0.0250, region: 'asia' },
  { country_code: '86', country_name: 'China', cost: 0.0350, region: 'asia' },
  { country_code: '81', country_name: 'Japan', cost: 0.0650, region: 'asia' },
  { country_code: '82', country_name: 'South Korea', cost: 0.0300, region: 'asia' },
  { country_code: '65', country_name: 'Singapore', cost: 0.0400, region: 'asia' },
  { country_code: '971', country_name: 'UAE', cost: 0.0350, region: 'asia' },

  // Oceania
  { country_code: '61', country_name: 'Australia', cost: 0.0450, region: 'oceania' },
  { country_code: '64', country_name: 'New Zealand', cost: 0.0550, region: 'oceania' },
].map(item => ({
  ...item,
  price: Number((item.cost * 1.15).toFixed(6)), // 15% markup
  currency: 'USD',
}));

export async function GET(request: NextRequest) {
  try {
    // 1. Validate API key (optional for pricing - can be public)
    const keyData = await validateApiKey(request);
    
    // Allow unauthenticated access to pricing, but rate limit
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country_code');
    const phoneNumber = searchParams.get('phone');
    const region = searchParams.get('region') as Continent | null;

    let pricing;

    // If phone number provided, get specific pricing
    if (phoneNumber) {
      const specificPricing = getSMSPricing(phoneNumber);
      pricing = [{
        country_code: specificPricing.countryCode,
        country_name: specificPricing.countryName,
        price_per_message: specificPricing.pricePerMessage,
        currency: specificPricing.currency,
        region: specificPricing.continent,
      }];
    }
    // If country code provided, filter by it
    else if (countryCode) {
      pricing = SMS_PRICING_TABLE.filter(p => p.country_code === countryCode);
      
      // If not found in table, calculate dynamically
      if (pricing.length === 0) {
        const phoneForCalc = `+${countryCode}123456789`;
        const calcPricing = getSMSPricing(phoneForCalc);
        pricing = [{
          country_code: calcPricing.countryCode,
          country_name: calcPricing.countryName,
          price_per_message: calcPricing.pricePerMessage,
          currency: calcPricing.currency,
          region: calcPricing.continent,
        }];
      } else {
        pricing = pricing.map(p => ({
          country_code: p.country_code,
          country_name: p.country_name,
          price_per_message: p.price,
          currency: 'USD',
          region: p.region,
        }));
      }
    }
    // If region provided, filter by it
    else if (region) {
      pricing = SMS_PRICING_TABLE
        .filter(p => p.region === region)
        .map(p => ({
          country_code: p.country_code,
          country_name: p.country_name,
          price_per_message: p.price,
          currency: 'USD',
          region: p.region,
        }));
    }
    // Return all pricing
    else {
      pricing = SMS_PRICING_TABLE.map(p => ({
        country_code: p.country_code,
        country_name: p.country_name,
        price_per_message: p.price,
        currency: 'USD',
        region: p.region,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        pricing,
        notes: {
          segments: 'SMS longer than 160 characters (or 70 for unicode) are split into multiple segments',
          unicode: 'Messages with non-ASCII characters use 70 chars per segment instead of 160',
          pricing_basis: 'Price is per segment, not per message',
        },
      },
    });

  } catch (error) {
    console.error('SMS Pricing API Error:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
