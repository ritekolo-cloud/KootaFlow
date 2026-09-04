import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import authRoutes from '../modules/auth/auth.routes';
import groupRoutes from '../modules/groups/groups.routes';
import memberRoutes from '../modules/members/members.routes';
import savingsRoutes from '../modules/savings/savings.routes';
import sharesRoutes from '../modules/shares/shares.routes';
import loanRoutes from '../modules/loans/loans.routes';
import transactionRoutes from '../modules/transactions/transactions.routes';
import shareOutRoutes from '../modules/shareout/shareout.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import notificationRoutes from '../modules/notifications/notifications.routes';
import usersRoutes from '../modules/users/users.routes';
import { prisma } from '../config/database';
import { env } from '../config/env';

const router = Router();

// ─── Public ────────────────────────────────────────────────────────────────
router.get('/health', async (_req, res) => {
  let dbStatus = 'connected';
  let dbError: string | undefined;
  let stats: Record<string, number> = {};

  // Expose which DB host the server is connecting to (hostname only, no credentials)
  let dbHost = 'unknown';
  try {
    const url = new URL(env.databaseUrl);
    dbHost = url.hostname;
  } catch (_) {}

  let timer: NodeJS.Timeout | undefined;
  try {
    const dbPromise = Promise.all([
      prisma.vslaGroup.count(),
      prisma.member.count(),
      prisma.user.count(),
    ]);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Health check DB timeout (8s)')), 8000);
    });
    const [groupCount, memberCount, userCount] = await Promise.race([dbPromise, timeoutPromise]);
    stats = { groups: groupCount, members: memberCount, users: userCount };
  } catch (err: any) {
    dbStatus = 'unavailable';
    dbError = err?.message || String(err);
  } finally {
    if (timer) clearTimeout(timer);
  }

  res.status(200).json({
    success: true,
    message: 'KootaFlow VSLA API is running',
    version: '1.0.0',
    database: dbStatus,
    dbHost,
    ...(dbError ? { dbError } : {}),
    stats,
    timestamp: new Date().toISOString(),
  });
});

// ─── Auth (public + protected) ──────────────────────────────────────────────
router.use('/auth', authRoutes);

// ─── Protected routes ────────────────────────────────────────────────────────
router.use('/groups', authenticate, groupRoutes);
router.use('/members', authenticate, memberRoutes);
router.use('/savings', authenticate, savingsRoutes);
router.use('/shares', authenticate, sharesRoutes);
router.use('/loans', authenticate, loanRoutes);
router.use('/transactions', authenticate, transactionRoutes);
router.use('/shareout', authenticate, shareOutRoutes);
router.use('/dashboard', authenticate, dashboardRoutes);
router.use('/notifications', authenticate, notificationRoutes);
router.use('/users', authenticate, usersRoutes);

export default router;
