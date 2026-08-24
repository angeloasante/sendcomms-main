const { createClient } = require('@supabase/supabase-js');

// Load .env.local without requiring a dotenv dependency
try {
  require('fs').readFileSync('.env.local', 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch {}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY (e.g. in .env.local) before running.');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupFirstCustomer() {
  try {
    // Generate a random API key
    const crypto = require('crypto');
    const apiKey = 'sc_live_' + crypto.randomBytes(24).toString('hex');
    // Only the SHA-256 hash is stored; the raw key is printed once below.
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
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
            console.log('\n🔑 An API key already exists (hash only is stored; create a new key in the dashboard if you need the secret).');
            return;
          }
          
          // Create new API key for existing customer
          const { data: newKey, error: keyError } = await supabase
            .from('api_keys')
            .insert({
              customer_id: existingCustomer.id,
              key_hash: apiKeyHash,
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
          console.log('\n🔑 API Key (shown once):', apiKey);
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
        key_hash: apiKeyHash,
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
