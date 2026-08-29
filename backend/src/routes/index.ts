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

const router = Router();

// ─── Public ────────────────────────────────────────────────────────────────
router.get('/health', async (_req, res, next) => {
  try {
    const [groupCount, memberCount, userCount] = await Promise.all([
      prisma.vslaGroup.count(),
      prisma.member.count(),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      message: 'KootaFlow VSLA API is running',
      version: '1.0.0',
      database: 'connected',
      stats: { groups: groupCount, members: memberCount, users: userCount },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
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
