import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Simple in-memory cache for customer data (cleared on server restart)
const customerCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function GET() {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache first
    const cached = customerCache.get(user.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // First, try to get customer by auth_user_id
    let { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id, email, name, plan, balance, is_active')
      .eq('auth_user_id', user.id)
      .single();

    // If no customer found by auth_user_id
    if (customerError && customerError.code === 'PGRST116') {
      // Check if customer exists by email (might be a pre-existing customer)
      const { data: existingCustomer, error: emailError } = await supabaseAdmin
        .from('customers')
        .select('id, email, name, plan, balance, is_active, auth_user_id')
        .eq('email', user.email)
        .single();

      if (existingCustomer && !existingCustomer.auth_user_id) {
        // Link existing customer to this auth user
        const { data: updatedCustomer, error: updateError } = await supabaseAdmin
          .from('customers')
          .update({ 
            auth_user_id: user.id,
            name: existingCustomer.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          })
          .eq('id', existingCustomer.id)
          .select('id, email, name, plan, balance, is_active')
          .single();

        if (updateError) {
          console.error('Error linking customer:', updateError);
          return NextResponse.json({ error: 'Failed to link customer', details: updateError.message }, { status: 500 });
        }
        customer = updatedCustomer;
      } else if (existingCustomer && existingCustomer.auth_user_id) {
        // Customer email exists but linked to different auth user
        return NextResponse.json({ error: 'Email already associated with another account' }, { status: 409 });
      } else if (!existingCustomer) {
        // No customer exists at all, create new one
        const { data: newCustomer, error: createError } = await supabaseAdmin
          .from('customers')
          .insert({
            auth_user_id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            plan: 'free',
            balance: 0,
            is_active: true,
          })
          .select('id, email, name, plan, balance, is_active')
          .single();

        if (createError) {
          console.error('Error creating customer:', createError);
          return NextResponse.json({ error: 'Failed to create customer', details: createError.message }, { status: 500 });
        }
        customer = newCustomer;
      }
      
      if (emailError && emailError.code !== 'PGRST116') {
        console.error('Error checking email:', emailError);
        return NextResponse.json({ error: 'Failed to check customer', details: emailError.message }, { status: 500 });
      }
    } else if (customerError) {
      console.error('Error fetching customer:', customerError);
      return NextResponse.json({ error: 'Failed to fetch customer', details: customerError.message }, { status: 500 });
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if account is active
    if (!customer.is_active) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    const responseData = {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      plan: customer.plan,
      balance: customer.balance,
    };

    // Cache the result
    customerCache.set(user.id, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Customer API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
