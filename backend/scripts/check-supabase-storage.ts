import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

console.log('Connecting to Supabase Storage at:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('❌ Error listing buckets:', error.message);
      return;
    }

    console.log(`Found ${buckets?.length || 0} bucket(s):`);
    buckets?.forEach(b => {
      console.log(` - ID: "${b.id}", Name: "${b.name}", Public: ${b.public}`);
    });

    const mukeshBucket = buckets?.find(b => b.name === 'mukesh' || b.id === 'mukesh');
    if (mukeshBucket) {
      console.log('✅ Bucket "mukesh" is FOUND and ACTIVE!');
      console.log('Details:', JSON.stringify(mukeshBucket, null, 2));

      const { data: files, error: fileError } = await supabase.storage.from('mukesh').list();
      if (fileError) {
        console.error('⚠️ Could not list files inside "mukesh":', fileError.message);
      } else {
        console.log(`✅ Listed files in "mukesh" successfully (${files?.length || 0} files found):`);
        files?.forEach(f => console.log(`   - ${f.name} (${f.metadata?.size || 0} bytes)`));
      }
    } else {
      console.log('⚠️ Bucket named "mukesh" was NOT found in the bucket list.');
    }
  } catch (err: any) {
    console.error('Storage check failed:', err.message);
  }
}

checkStorage();
