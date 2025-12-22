import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Get the user after successful auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if customer already exists
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        
        // Create customer record if it doesn't exist
        if (!existingCustomer) {
          await supabase
            .from('customers')
            .insert({
              auth_user_id: user.id,
              email: user.email,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              plan: 'free',
              balance: 0,
              is_active: true,
            });
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
