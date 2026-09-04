import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

const productionFrontendOrigins = 'https://kootaflow-66mf.onrender.com,https://kootaflow-client-nz3v.onrender.com';
const developmentFrontendOrigin = 'http://localhost:5173';
const productionDatabaseUrl =
  'postgresql://neondb_owner:npg_uDQg2k6JHARv@ep-weathered-wind-ab7o9vmz-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=20';
const productionDirectUrl =
  'postgresql://neondb_owner:npg_uDQg2k6JHARv@ep-weathered-wind-ab7o9vmz.eu-west-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=20';
const developmentDatabaseUrl =
  'postgresql://kootaflow_user:kootaflow_secret_2026@localhost:5432/kootaflow_vsla?schema=public';
const developmentJwtSecret = 'kootaflow_dev_jwt_secret_key_32_bytes_long_min!';
const developmentJwtRefreshSecret = 'kootaflow_dev_jwt_refresh_secret_key_32_bytes!';
const developmentAdminPassword = 'Admin@123456';

// Load env from multiple possible locations
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isTestEnv = process.env.NODE_ENV === 'test';
const isProductionEnv = process.env.NODE_ENV === 'production';

function getEffectiveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (envUrl) {
    // If in production and the URL points to a Render-internal Postgres (dpg-* host)
    // or localhost, override with our Neon production URL
    if (isProductionEnv && (envUrl.includes('localhost') || /dpg-[a-z0-9]/.test(envUrl))) {
      console.log('[env] DATABASE_URL is a Render-internal/local DB; using Neon production URL instead.');
      return productionDatabaseUrl;
    }
    return envUrl;
  }
  return isProductionEnv ? productionDatabaseUrl : developmentDatabaseUrl;
}

function getEffectiveDirectUrl(): string | undefined {
  const envDirect = process.env.DIRECT_URL?.trim();
  // Ignore DIRECT_URL if it's a Render-internal DB (dpg-* host) — use Neon instead
  if (envDirect && !(isProductionEnv && /dpg-[a-z0-9]/.test(envDirect))) {
    return envDirect;
  }
  const dbUrl = getEffectiveDatabaseUrl();
  if (dbUrl.includes('-pooler')) {
    return dbUrl.replace('-pooler', '');
  }
  return isProductionEnv ? productionDirectUrl : undefined;
}


const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().default(getEffectiveDatabaseUrl()),
  DIRECT_URL: z.string().default(getEffectiveDirectUrl() || ''),
  JWT_SECRET: z.string().default(process.env.JWT_SECRET || developmentJwtSecret),
  JWT_REFRESH_SECRET: z.string().default(process.env.JWT_REFRESH_SECRET || developmentJwtRefreshSecret),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default(isProductionEnv ? productionFrontendOrigins : developmentFrontendOrigin),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('KootaFlow VSLA <noreply@kootaflow.com>'),
  BCRYPT_ROUNDS: z.string().default('12'),
  ADMIN_NAME: z.string().default('KootaFlow Administrator'),
  ADMIN_EMAIL: z.string().default('admin@kootaflow.com'),
  ADMIN_PASSWORD: z.string().default(process.env.ADMIN_PASSWORD || developmentAdminPassword),
  UPLOAD_DIR: z.string().default('uploads'),
  LOG_LEVEL: z.string().default('info'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  CORS_ORIGIN: z.string().default(isProductionEnv ? productionFrontendOrigins : developmentFrontendOrigin),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  if (!isTestEnv) {
    process.exit(1);
  }
}

const envData = parsed.success
  ? parsed.data
  : envSchema.parse({
      NODE_ENV: 'test',
    });

export const env = {
  nodeEnv: envData.NODE_ENV,
  port: parseInt(envData.PORT, 10),
  databaseUrl: envData.DATABASE_URL,
  directUrl: envData.DIRECT_URL,
  jwt: {
    secret: envData.JWT_SECRET,
    refreshSecret: envData.JWT_REFRESH_SECRET,
    expiresIn: envData.JWT_EXPIRES_IN,
    refreshExpiresIn: envData.JWT_REFRESH_EXPIRES_IN,
  },
  clientUrl: envData.CLIENT_URL,
  smtp: {
    host: envData.SMTP_HOST,
    port: parseInt(envData.SMTP_PORT, 10),
    user: envData.SMTP_USER,
    pass: envData.SMTP_PASS,
    from: envData.EMAIL_FROM,
  },
  bcryptRounds: parseInt(envData.BCRYPT_ROUNDS, 10),
  admin: {
    name: envData.ADMIN_NAME,
    email: envData.ADMIN_EMAIL,
    password: envData.ADMIN_PASSWORD,
  },
  uploadDir: envData.UPLOAD_DIR,
  logLevel: envData.LOG_LEVEL,
  rateLimit: {
    windowMs: parseInt(envData.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(envData.RATE_LIMIT_MAX_REQUESTS, 10),
  },
  corsOrigin: envData.CORS_ORIGIN,
  corsOrigins: envData.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  isDev: envData.NODE_ENV === 'development',
  isProd: envData.NODE_ENV === 'production',
};
