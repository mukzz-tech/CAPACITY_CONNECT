import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testTables() {
  const tables = ['User', 'Profile', 'Course', 'Lesson', 'Announcement'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(5);
    console.log(t, '->', error ? ('Error: ' + error.message) : (`Found ${data?.length} rows`));
  }
}
testTables();
