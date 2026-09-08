import { prisma } from '../src/prisma.js';

async function main() {
  try {
    const users = await prisma.user.findMany({ select: { email: true, role: true } });
    console.log('Users found:', users);
    const announcements = await prisma.announcement.findMany();
    console.log('Announcements count:', announcements.length);
  } catch (e: any) {
    console.error('Error querying SQLite:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
