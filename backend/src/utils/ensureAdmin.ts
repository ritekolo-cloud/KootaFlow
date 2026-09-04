import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Idempotently ensures the admin user exists in the database.
 * Called at server startup so a fresh database always has a working admin.
 */
export async function ensureAdminExists(): Promise<void> {
  try {
    const adminEmail = env.admin.email;
    const adminPassword = env.admin.password;

    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      logger.info('Admin user exists: ' + adminEmail);
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, env.bcryptRounds);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isActive: true,
      },
    });

    logger.info('Admin user created on first startup: ' + adminEmail);
  } catch (error: any) {
    // Non-fatal so server still starts; logged for visibility.
    logger.warn('ensureAdminExists skipped: ' + (error?.message ?? String(error)));
  }
}

