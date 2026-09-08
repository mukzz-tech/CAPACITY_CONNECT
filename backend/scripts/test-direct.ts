import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// Test DIRECT_URL
const directUrl = process.env.DIRECT_URL;
console.log('Testing direct URL:', directUrl ? directUrl.replace(/:[^:@]+@/, ':****@') : '(none)');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});

async function testConnection() {
  try {
    console.log('Connecting with DIRECT_URL...');
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log(`✅ Direct URL SUCCESS! Found ${count} user records.`);
  } catch (err: any) {
    console.error('❌ Direct URL error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
