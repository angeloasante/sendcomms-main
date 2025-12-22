import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return user;
}

export async function getCustomer() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return null;
  }
  
  // Get or create customer record
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  
  if (customerError && customerError.code !== 'PGRST116') {
    console.error('Error fetching customer:', customerError);
    return null;
  }
  
  return customer;
}

export async function requireCustomer() {
  const user = await requireAuth();
  const supabase = await createClient();
  
  // Get customer record
  let { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  
  // If no customer exists, create one
  if (customerError && customerError.code === 'PGRST116') {
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        auth_user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        plan: 'free',
        balance: 0,
        is_active: true,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating customer:', createError);
      redirect('/login?error=customer_creation_failed');
    }
    
    customer = newCustomer;
  } else if (customerError) {
    console.error('Error fetching customer:', customerError);
    redirect('/login?error=customer_fetch_failed');
  }
  
  // Check if customer is active
  if (!customer?.is_active) {
    redirect('/login?error=account_inactive');
  }
  
  return { user, customer };
}
