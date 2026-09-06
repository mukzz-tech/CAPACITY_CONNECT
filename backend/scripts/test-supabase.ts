import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

console.log('--- Supabase Database Connection Tester ---');
const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

console.log('DATABASE_URL configured:', dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : '(none)');
console.log('DIRECT_URL configured:  ', directUrl ? directUrl.replace(/:[^:@]+@/, ':****@') : '(none)');

if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.log('\n❌ DATABASE_URL is not currently pointing to a Supabase PostgreSQL instance.');
  console.log('To connect to Supabase:');
  console.log('1. Go to your Supabase Project Settings -> Database -> Connection String.');
  console.log('2. Select "URI" and choose "Transaction" or "Session" mode.');
  console.log('3. In backend/.env, set:');
  console.log('   DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"');
  console.log('   DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"');
  console.log('4. Run: npm run db:use-supabase');
  console.log('5. Run: npm run supabase:push');
  console.log('6. Run: npm run seed');
  process.exit(0);
}

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('\nConnecting to Supabase PostgreSQL database...');
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log(`✅ Successfully connected to Supabase! Found ${count} user records.`);
  } catch (err: any) {
    console.error('❌ Connection error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
