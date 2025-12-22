import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateApiKey, errorResponse } from '@/lib/api-helpers';
import crypto from 'crypto';

// Lazy-initialized Supabase client
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

// Generate a new API key
function generateApiKey(): string {
  const prefix = 'sc_live_';
  const randomPart = crypto.randomBytes(24).toString('hex');
  return `${prefix}${randomPart}`;
}

// GET - List all API keys for the authenticated customer
export async function GET(request: NextRequest) {
  try {
    // Validate API key (customer must be authenticated)
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // Fetch all API keys for this customer
    const { data: keys, error } = await getSupabase()
      .from('api_keys')
      .select('id, name, key_preview, permissions, is_active, created_at, last_used_at')
      .eq('customer_id', keyData.customer_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return errorResponse('Failed to fetch API keys', 500, 'DATABASE_ERROR');
    }

    return NextResponse.json({
      success: true,
      data: {
        keys: keys || []
      }
    });
  } catch (error) {
    console.error('Error in GET /api/v1/dashboard/keys:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// POST - Create a new API key
export async function POST(request: NextRequest) {
  try {
    // Validate API key (customer must be authenticated)
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // Parse request body
    const body = await request.json();
    const { name, permissions = ['email', 'sms', 'airtime', 'data'] } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('Key name is required', 400, 'INVALID_NAME');
    }

    if (name.length > 100) {
      return errorResponse('Key name must be less than 100 characters', 400, 'INVALID_NAME');
    }

    // Check how many keys this customer has (limit to 10)
    const { count } = await getSupabase()
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', keyData.customer_id);

    if (count && count >= 10) {
      return errorResponse('Maximum of 10 API keys allowed per account', 400, 'LIMIT_EXCEEDED');
    }

    // Generate new API key
    const newApiKey = generateApiKey();
    const keyPreview = `${newApiKey.substring(0, 12)}...${newApiKey.substring(newApiKey.length - 4)}`;

    // Save to database
    const { data: createdKey, error } = await getSupabase()
      .from('api_keys')
      .insert({
        customer_id: keyData.customer_id,
        key_hash: newApiKey, // In production, you'd hash this
        key_preview: keyPreview,
        name: name.trim(),
        permissions,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select('id, name, key_preview, permissions, is_active, created_at')
      .single();

    if (error) {
      console.error('Error creating API key:', error);
      return errorResponse('Failed to create API key', 500, 'DATABASE_ERROR');
    }

    // Return the full key ONLY on creation (never again)
    return NextResponse.json({
      success: true,
      data: {
        key: createdKey,
        apiKey: newApiKey, // Full key - only shown once!
        message: 'API key created successfully. Copy the key now - you won\'t be able to see it again!'
      }
    });
  } catch (error) {
    console.error('Error in POST /api/v1/dashboard/keys:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}

// DELETE - Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    // Validate API key (customer must be authenticated)
    const keyData = await validateApiKey(request);
    if (!keyData) {
      return errorResponse('Invalid or missing API key', 401, 'UNAUTHORIZED');
    }

    // Get key ID from query params
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return errorResponse('Key ID is required', 400, 'INVALID_ID');
    }

    // Prevent deleting the key being used for authentication
    if (keyId === keyData.id) {
      return errorResponse('Cannot delete the API key currently in use', 400, 'CANNOT_DELETE_CURRENT');
    }

    // Check if key belongs to this customer
    const { data: existingKey } = await getSupabase()
      .from('api_keys')
      .select('id, customer_id')
      .eq('id', keyId)
      .eq('customer_id', keyData.customer_id)
      .single();

    if (!existingKey) {
      return errorResponse('API key not found', 404, 'NOT_FOUND');
    }

    // Soft delete (mark as inactive) instead of hard delete
    const { error } = await getSupabase()
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId);

    if (error) {
      console.error('Error deleting API key:', error);
      return errorResponse('Failed to delete API key', 500, 'DATABASE_ERROR');
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'API key revoked successfully'
      }
    });
  } catch (error) {
    console.error('Error in DELETE /api/v1/dashboard/keys:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
