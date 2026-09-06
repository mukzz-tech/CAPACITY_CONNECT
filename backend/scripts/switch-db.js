import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const target = process.argv[2] ? process.argv[2].toLowerCase() : 'supabase';

const rootDir = path.resolve(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');
const schemaTarget = path.join(prismaDir, 'schema.prisma');

let sourceFile = '';
if (target === 'supabase' || target === 'postgres' || target === 'postgresql') {
  sourceFile = path.join(prismaDir, 'schema.supabase.prisma');
  console.log('⚡ Switching database target to: SUPABASE (PostgreSQL)');
} else if (target === 'sqlite' || target === 'local') {
  sourceFile = path.join(prismaDir, 'schema.sqlite.prisma');
  console.log('⚡ Switching database target to: LOCAL SQLITE');
} else {
  console.error('❌ Unknown target. Use "supabase" or "sqlite".');
  process.exit(1);
}

if (!fs.existsSync(sourceFile)) {
  console.error(`❌ Source schema file not found: ${sourceFile}`);
  process.exit(1);
}

// Copy source file to schema.prisma
fs.copyFileSync(sourceFile, schemaTarget);
console.log(`✅ Updated schema.prisma from ${path.basename(sourceFile)}`);

try {
  console.log('🔄 Running `npx prisma generate`...');
  execSync('npx prisma generate', { cwd: rootDir, stdio: 'inherit' });
  console.log('🎉 Database provider switched successfully!');
} catch (error) {
  console.error('⚠️ prisma generate encountered an issue:', error.message);
}
