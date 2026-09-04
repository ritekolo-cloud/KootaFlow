const { execSync } = require('child_process');
const path = require('path');

// Ensure dotenv is loaded if present locally
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
} catch (_) {}

// Fallback DIRECT_URL to DATABASE_URL if unset (strip pooler suffix for direct connection)
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL.replace('-pooler', '');
  console.log('DIRECT_URL was not set; derived from DATABASE_URL for Prisma.');
}

const backendDir = path.resolve(__dirname, '../backend');

// Step 1: Try prisma migrate deploy first (preferred for production)
try {
  console.log('[migrate] Step 1: Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: backendDir,
    env: process.env,
  });
  console.log('[migrate] prisma migrate deploy completed.');
} catch (error) {
  console.warn('[migrate] migrate deploy encountered an issue:', error.message);
  // Non-fatal: continue to db push fallback
}

// Step 2: Always run db push to ensure schema is in sync
// This handles the case where _prisma_migrations shows "applied" but tables are missing
// (e.g. when the Neon DB was previously used by a different project)
try {
  console.log('[migrate] Step 2: Running prisma db push to ensure schema sync...');
  execSync('npx prisma db push --skip-generate --accept-data-loss --schema=./prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: backendDir,
    env: process.env,
  });
  console.log('[migrate] Schema is now in sync with Prisma schema.');
} catch (error) {
  console.error('[migrate] db push failed:', error.message);
  process.exit(1);
}

