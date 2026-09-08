import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkSupabaseUsers() {
  console.log('=== SUPABASE USERS & PROFILES ===');
  
  const { data: users, error: userError } = await supabase
    .from('User')
    .select('id, email, role, requestedRole, approvalStatus, createdAt');
  
  if (userError) {
    console.error('Error fetching Supabase users:', userError.message);
  } else {
    console.log(`Found ${users?.length || 0} user(s) in Supabase:`);
    console.table(users);
  }

  const { data: profiles, error: profileError } = await supabase
    .from('Profile')
    .select('id, userId, fullName, jobDesignation, department');

  if (profileError) {
    console.error('Error fetching Supabase profiles:', profileError.message);
  } else {
    console.log(`Found ${profiles?.length || 0} profile(s) in Supabase:`);
    console.table(profiles);
  }
}

checkSupabaseUsers();
