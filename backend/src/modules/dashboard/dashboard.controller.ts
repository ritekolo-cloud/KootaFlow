import { Response, NextFunction } from 'express';
import { LoanStatus, TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;

    const groupFilter = groupId ? { groupId } : {};
    const memberGroupFilter = groupId ? { member: { groupId } } : {};

    // ─── Core counts ─────────────────────────────────────────────────────
    const [
      totalGroups,
      totalMembers,
      activeMembers,
      totalUsers,
      activeCycles,
    ] = await Promise.all([
      prisma.vslaGroup.count(),
      groupId ? prisma.member.count({ where: { groupId } }) : prisma.member.count(),
      prisma.member.count({ where: { ...(groupId ? { groupId } : {}), status: 'ACTIVE' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.cycle.count({ where: { ...(groupId ? { groupId } : {}), status: 'ACTIVE' } }),
    ]);

    // ─── Loan stats ───────────────────────────────────────────────────────
    const [
      pendingLoans,
      activeLoans,
      totalLoansDisbursed,
      totalLoanOutstanding,
      defaultedLoans,
    ] = await Promise.all([
      prisma.loan.count({ where: { ...memberGroupFilter, status: LoanStatus.PENDING } }),
      prisma.loan.count({ where: { ...memberGroupFilter, status: LoanStatus.ACTIVE } }),
      prisma.loan.aggregate({ where: { ...memberGroupFilter, status: { not: LoanStatus.PENDING } }, _sum: { principalAmount: true } }),
      prisma.loan.aggregate({ where: { ...memberGroupFilter, status: LoanStatus.ACTIVE }, _sum: { balanceRemaining: true } }),
      prisma.loan.count({ where: { ...memberGroupFilter, status: LoanStatus.DEFAULTED } }),
    ]);

    // ─── Financial totals ─────────────────────────────────────────────────
    const [
      totalShareValue,
      totalSavings,
      totalRepayments,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...groupFilter, type: TransactionType.SHARE_PURCHASE },
        _sum: { amount: true },
      }),
      prisma.savingsAccount.aggregate({
        where: groupId ? { member: { groupId } } : {},
        _sum: { balance: true },
      }),
      prisma.transaction.aggregate({
        where: { ...groupFilter, type: TransactionType.LOAN_REPAYMENT },
        _sum: { amount: true },
      }),
    ]);

    // ─── Recent transactions (last 10) ────────────────────────────────────
    const recentTransactions = await prisma.transaction.findMany({
      where: groupFilter,
      take: 10,
      orderBy: { transactionDate: 'desc' },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
      },
    });

    // ─── Monthly share & savings trend (last 6 months) ───────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        ...groupFilter,
        transactionDate: { gte: sixMonthsAgo },
        type: { in: [TransactionType.SHARE_PURCHASE, TransactionType.SAVINGS_DEPOSIT, TransactionType.LOAN_REPAYMENT] },
      },
      _sum: { amount: true },
    });

    // ─── Pending loan applications (for admin action) ─────────────────────
    const pendingLoanDetails = await prisma.loan.findMany({
      where: { ...memberGroupFilter, status: LoanStatus.PENDING },
      take: 5,
      orderBy: { createdAt: 'asc' },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
      },
    });

    sendSuccess(res, {
      overview: {
        totalGroups,
        totalMembers,
        activeMembers,
        totalUsers,
        activeCycles,
      },
      loans: {
        pending: pendingLoans,
        active: activeLoans,
        defaulted: defaultedLoans,
        totalDisbursed: Number(totalLoansDisbursed._sum.principalAmount ?? 0),
        totalOutstanding: Number(totalLoanOutstanding._sum.balanceRemaining ?? 0),
        totalRepaid: Number(totalRepayments._sum.amount ?? 0),
      },
      financials: {
        totalShareValue: Number(totalShareValue._sum.amount ?? 0),
        totalSavings: Number(totalSavings._sum.balance ?? 0),
      },
      recentTransactions,
      pendingLoanDetails,
      monthlyTrend,
    }, 'Dashboard statistics retrieved');
  } catch (err) {
    next(err);
  }
}
