const { execSync } = require('child_process');
const path = require('path');

// Ensure dotenv is loaded if present locally
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
} catch (_) {}

// ── Force Neon in production if Render injected a dpg-* internal Postgres URL ──
const NEON_DATABASE_URL =
  'postgresql://neondb_owner:npg_uDQg2k6JHARv@ep-weathered-wind-ab7o9vmz-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=20';
const NEON_DIRECT_URL =
  'postgresql://neondb_owner:npg_uDQg2k6JHARv@ep-weathered-wind-ab7o9vmz.eu-west-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=20';

const currentDbUrl = process.env.DATABASE_URL || '';
const isRenderInternal = /dpg-[a-z0-9]/.test(currentDbUrl) || currentDbUrl.includes('localhost');

if (isRenderInternal || !currentDbUrl) {
  console.log('[migrate] Detected Render-internal/missing DATABASE_URL; switching to Neon production DB.');
  process.env.DATABASE_URL = NEON_DATABASE_URL;
  process.env.DIRECT_URL = NEON_DIRECT_URL;
} else {
  // Fallback DIRECT_URL to non-pooler variant of DATABASE_URL if unset
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = currentDbUrl.replace('-pooler', '');
    console.log('[migrate] DIRECT_URL derived from DATABASE_URL.');
  }
}

console.log('[migrate] Using DB host:', (() => { try { return new URL(process.env.DATABASE_URL).hostname; } catch(_) { return 'unknown'; } })());

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

