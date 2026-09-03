const { execSync } = require('child_process');
const path = require('path');

// Ensure dotenv is loaded if present locally
try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
} catch (_) {}

// Fallback DIRECT_URL to DATABASE_URL if unset
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL.replace('-pooler', '');
  console.log('DIRECT_URL was not set; falling back to DATABASE_URL for Prisma migrations.');
}

const backendDir = path.resolve(__dirname, '../backend');

try {
  console.log('Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
    stdio: 'inherit',
    cwd: backendDir,
    env: process.env,
  });
  console.log('Prisma migrations applied successfully.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
