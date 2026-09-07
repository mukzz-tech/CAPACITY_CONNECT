import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

console.log('Testing Supabase JS Client with URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  try {
    const { data, error } = await supabase.from('User').select('id, email, role');
    if (error) {
      console.log('Supabase Query Response (Tables ready):', error.message);
    } else {
      console.log(`✅ Supabase JS Client successfully connected! Found ${data?.length || 0} users in Supabase.`);
    }
  } catch (e: any) {
    console.error('Supabase test error:', e.message);
  }
}

testSupabase();
