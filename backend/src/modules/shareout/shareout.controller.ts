import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { LoanStatus, TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const executeShareOutSchema = z.object({
  cycleId: z.number().int().positive(),
  notes: z.string().optional(),
  distributionDate: z.string().datetime().optional(),
});

export async function listShareOuts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;
    const shareOuts = await prisma.shareOut.findMany({
      where: groupId ? { cycle: { groupId } } : {},
      orderBy: { distributionDate: 'desc' },
      include: {
        cycle: { select: { id: true, cycleNumber: true, groupId: true } },
        distributions: {
          include: { member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } } },
        },
      },
    });
    sendSuccess(res, shareOuts, 'Share-outs retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getShareOutById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const shareOut = await prisma.shareOut.findUnique({
      where: { id },
      include: {
        cycle: { select: { id: true, cycleNumber: true } },
        distributions: {
          include: { member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } } },
        },
      },
    });
    if (!shareOut) throw new AppError('Share-out record not found', 404);
    sendSuccess(res, shareOut, 'Share-out retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * Preview share-out calculation without executing it.
 * GET /api/shareout/calculate?cycleId=1
 */
export async function calculateShareOut(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const cycleId = parseInt(req.query.cycleId as string, 10);
    if (!cycleId) throw new AppError('cycleId query parameter is required', 400);

    const preview = await computeShareOut(cycleId);
    sendSuccess(res, preview, 'Share-out calculation preview');
  } catch (err) {
    next(err);
  }
}

/**
 * Execute share-out for a cycle. This is a destructive operation:
 * - Cycle must be ACTIVE
 * - All active loans are marked DEFAULTED and deducted from payouts
 * - Share-out record + per-member distributions are created
 * - Cycle is marked COMPLETED
 */
export async function executeShareOut(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = executeShareOutSchema.parse(req.body);

    // Ensure no duplicate share-out for this cycle
    const existingShareOut = await prisma.shareOut.findFirst({ where: { cycleId: data.cycleId } });
    if (existingShareOut) throw new AppError('Share-out has already been executed for this cycle', 409);

    const preview = await computeShareOut(data.cycleId);
    const { cycle, totalFunds, totalShares, valuePerShare, memberBreakdown } = preview;

    if (totalShares === 0) throw new AppError('No shares recorded in this cycle — cannot execute share-out', 400);

    const distributionDate = data.distributionDate ? new Date(data.distributionDate) : new Date();

    // Execute everything atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create share-out record
      const shareOut = await tx.shareOut.create({
        data: {
          cycleId: data.cycleId,
          totalFunds,
          totalShares,
          valuePerShare,
          distributionDate,
          notes: data.notes,
        },
      });

      // 2. Mark all remaining active loans as DEFAULTED
      await tx.loan.updateMany({
        where: { cycleId: data.cycleId, status: LoanStatus.ACTIVE },
        data: { status: LoanStatus.DEFAULTED },
      });

      // 3. Create per-member distributions
      const distributions = [];
      for (const mb of memberBreakdown) {
        const dist = await tx.shareOutDistribution.create({
          data: {
            shareOutId: shareOut.id,
            memberId: mb.memberId,
            sharesOwned: mb.sharesOwned,
            grossAmount: mb.grossAmount,
            loanDeductions: mb.loanDeductions,
            netPayout: mb.netPayout,
          },
        });
        distributions.push(dist);

        // Record transaction for each member
        await tx.transaction.create({
          data: {
            groupId: cycle.groupId,
            memberId: mb.memberId,
            type: TransactionType.SHARE_OUT,
            amount: mb.netPayout,
            description: `Share-out payout: ${mb.sharesOwned} shares @ ${valuePerShare} each. Loan deduction: ${mb.loanDeductions}`,
            transactionDate: distributionDate,
          },
        });
      }

      // 4. Mark cycle COMPLETED
      await tx.cycle.update({
        where: { id: data.cycleId },
        data: { status: 'COMPLETED', endDate: distributionDate },
      });

      return { shareOut, distributions };
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'SHARE_OUT_EXECUTED',
        entity: 'ShareOut',
        entityId: result.shareOut.id,
        details: { cycleId: data.cycleId, totalFunds, totalShares, valuePerShare, memberCount: memberBreakdown.length },
      },
    });

    sendCreated(res, result, 'Share-out executed successfully');
  } catch (err) {
    next(err);
  }
}

// ─── Calculation helper ───────────────────────────────────────────────────

async function computeShareOut(cycleId: number) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: { group: true },
  });
  if (!cycle) throw new AppError('Cycle not found', 404);
  if (cycle.status === 'COMPLETED') throw new AppError('This cycle has already been completed', 400);

  // Gather all shares for this cycle
  const shares = await prisma.share.findMany({
    where: { cycleId },
    include: { member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } } },
  });

  // Aggregate shares per member
  const memberShareMap = new Map<number, { member: typeof shares[0]['member']; sharesOwned: number }>();
  for (const s of shares) {
    const existing = memberShareMap.get(s.memberId);
    if (existing) {
      existing.sharesOwned += s.quantity;
    } else {
      memberShareMap.set(s.memberId, { member: s.member, sharesOwned: s.quantity });
    }
  }
  const totalShares = Array.from(memberShareMap.values()).reduce((sum, m) => sum + m.sharesOwned, 0);

  // Total funds = sum of all shares + savings + loan repayments received for this cycle
  const [shareTxnTotal, repaymentTxnTotal, savingsTxnTotal] = await Promise.all([
    prisma.transaction.aggregate({
      where: { type: TransactionType.SHARE_PURCHASE, groupId: cycle.groupId },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.LOAN_REPAYMENT, groupId: cycle.groupId },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: TransactionType.SAVINGS_DEPOSIT, groupId: cycle.groupId },
      _sum: { amount: true },
    }),
  ]);

  const totalFunds = Math.round((
    Number(shareTxnTotal._sum.amount ?? 0) +
    Number(repaymentTxnTotal._sum.amount ?? 0) +
    Number(savingsTxnTotal._sum.amount ?? 0)
  ) * 100) / 100;

  const valuePerShare = totalShares > 0 ? Math.round((totalFunds / totalShares) * 100) / 100 : 0;

  // Get outstanding loan balances per member
  const activeLoans = await prisma.loan.findMany({
    where: { cycleId, status: { in: [LoanStatus.ACTIVE, LoanStatus.APPROVED] } },
    select: { memberId: true, balanceRemaining: true },
  });
  const loanDeductionMap = new Map<number, number>();
  for (const l of activeLoans) {
    loanDeductionMap.set(l.memberId, (loanDeductionMap.get(l.memberId) ?? 0) + Number(l.balanceRemaining));
  }

  const memberBreakdown = Array.from(memberShareMap.entries()).map(([memberId, data]) => {
    const grossAmount = Math.round(data.sharesOwned * valuePerShare * 100) / 100;
    const loanDeductions = Math.round((loanDeductionMap.get(memberId) ?? 0) * 100) / 100;
    const netPayout = Math.max(0, Math.round((grossAmount - loanDeductions) * 100) / 100);
    return {
      memberId,
      memberNumber: data.member.memberNumber,
      firstName: data.member.firstName,
      lastName: data.member.lastName,
      sharesOwned: data.sharesOwned,
      grossAmount,
      loanDeductions,
      netPayout,
    };
  });

  return { cycle, totalFunds, totalShares, valuePerShare, memberBreakdown };
}
