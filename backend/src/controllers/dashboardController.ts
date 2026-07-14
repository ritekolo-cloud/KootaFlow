import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const isMember = user?.role === 'MEMBER';
    const email = user?.email;

    const memberWhere = isMember && email ? { Member: { email } } : {};
    const loanWhere = isMember && email ? { status: 'ACTIVE' as const, Member: { email } } : { status: 'ACTIVE' as const };

    const totalMembers = await prisma.member.count();
    
    const savings = await prisma.saving.aggregate({
      _sum: { amount: true },
      where: memberWhere
    });
    const totalSavings = savings._sum.amount || 0;

    const activeLoansCount = await prisma.loan.count({
      where: loanWhere
    });

    const activeLoans = await prisma.loan.findMany({
      where: loanWhere,
      include: { Repayments: true }
    });

    let pendingRepaymentsAmount = 0;
    activeLoans.forEach(loan => {
      const totalExpected = loan.amount + (loan.amount * (loan.interestRate / 100));
      const totalPaid = loan.Repayments.reduce((sum, r) => sum + r.amountPaid, 0);
      pendingRepaymentsAmount += (totalExpected - totalPaid);
    });

    // Recent activities
    const recentSavings = await prisma.saving.findMany({
      take: 5,
      where: memberWhere,
      orderBy: { savingDate: 'desc' },
      include: { Member: true }
    });

    sendSuccess(res, {
      totalMembers,
      totalSavings,
      activeLoansCount,
      pendingRepaymentsAmount,
      recentActivities: recentSavings.map(s => ({
        id: s.id,
        type: 'SAVING',
        description: `${s.Member.fullName} saved ${s.amount}`,
        date: s.savingDate
      }))
    });
  } catch (error) {
    sendError(res, 'Error fetching dashboard stats', 500);
  }
};
