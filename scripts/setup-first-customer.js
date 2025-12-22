const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ckyzmgaqojixjuebcwni.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNreXptZ2Fxb2ppeGp1ZWJjd25pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0NDA2OCwiZXhwIjoyMDgxOTIwMDY4fQ.aDr33IW-E4BVqHZ6rm4kmBluoP5GrjbOFApJSQIBaq0'
);

async function setupFirstCustomer() {
  try {
    // Generate a random API key
    const crypto = require('crypto');
    const apiKey = 'ac_live_' + crypto.randomBytes(24).toString('hex');
    
    console.log('🚀 Setting up first customer...\n');

    // 1. Create the customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        email: 'admin@sendcomms.com',
        name: 'SendComms Admin',
        company: 'SendComms',
        plan: 'enterprise',
        balance: 100.00,
        is_active: true,
        webhook_url: null,
        webhook_secret: null
      })
      .select()
      .single();

    if (customerError) {
      if (customerError.code === '23505') {
        console.log('⚠️  Customer already exists, fetching existing...');
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('email', 'admin@sendcomms.com')
          .single();
        
        if (existingCustomer) {
          // Check if API key exists
          const { data: existingKey } = await supabase
            .from('api_keys')
            .select('*')
            .eq('customer_id', existingCustomer.id)
            .single();
          
          if (existingKey) {
            console.log('\n✅ Customer and API key already exist!\n');
            console.log('📧 Customer Email:', existingCustomer.email);
            console.log('💰 Balance: $' + existingCustomer.balance);
            console.log('📋 Plan:', existingCustomer.plan);
            console.log('\n🔑 API Key:', existingKey.key_hash);
            return;
          }
          
          // Create new API key for existing customer
          const { data: newKey, error: keyError } = await supabase
            .from('api_keys')
            .insert({
              customer_id: existingCustomer.id,
              key_hash: apiKey,
              name: 'Production API Key',
              permissions: ['email', 'sms', 'airtime', 'data'],
              is_active: true
            })
            .select()
            .single();
          
          if (keyError) throw keyError;
          
          console.log('\n✅ API key created for existing customer!\n');
          console.log('📧 Customer Email:', existingCustomer.email);
          console.log('💰 Balance: $' + existingCustomer.balance);
          console.log('\n🔑 API Key:', newKey.key_hash);
          return;
        }
      }
      throw customerError;
    }

    console.log('✅ Customer created:', customer.id);

    // 2. Create API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .insert({
        customer_id: customer.id,
        key_hash: apiKey,
        name: 'Production API Key',
        permissions: ['email', 'sms', 'airtime', 'data'],
        is_active: true
      })
      .select()
      .single();

    if (apiKeyError) throw apiKeyError;

    console.log('✅ API Key created!\n');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('           🎉 SETUP COMPLETE! 🎉                        ');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📧 Customer Email:', customer.email);
    console.log('🏢 Company:', customer.company);
    console.log('💰 Balance: $' + customer.balance);
    console.log('📋 Plan:', customer.plan);
    console.log('\n🔑 YOUR API KEY (save this!):\n');
    console.log('   ' + apiKey);
    console.log('\n═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

setupFirstCustomer();
