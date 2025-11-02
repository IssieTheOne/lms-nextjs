require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  try {
    // Test connection by trying to get auth user (will be null if not signed in)
    const { data, error } = await supabase.auth.getUser();
    if (error && error.message !== 'Auth session missing!') throw error;
    console.log('Supabase test passed: connection ok');
    return true;
  } catch (err) {
    console.error('Supabase test failed:', err.message);
    return false;
  }
}

testSupabase();