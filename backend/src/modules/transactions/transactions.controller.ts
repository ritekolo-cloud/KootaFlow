import { Response, NextFunction } from 'express';
import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendSuccess, parsePagination, buildPaginationMeta } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function listTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;
    const memberId = req.query.memberId ? parseInt(req.query.memberId as string, 10) : undefined;
    const type = req.query.type as TransactionType | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where: Record<string, unknown> = {};
    if (groupId) where.groupId = groupId;
    if (memberId) where.memberId = memberId;
    if (type) where.type = type;
    if (from || to) {
      where.transactionDate = {};
      if (from) (where.transactionDate as Record<string, unknown>).gte = new Date(from);
      if (to) (where.transactionDate as Record<string, unknown>).lte = new Date(to);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
          group: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    // Compute running totals for the filtered set
    const allForTotals = await prisma.transaction.findMany({
      where,
      select: { type: true, amount: true },
    });

    const totals: Record<string, number> = {};
    for (const t of allForTotals) {
      const key = t.type as string;
      totals[key] = (totals[key] ?? 0) + Number(t.amount);
    }

    sendSuccess(res, { transactions, totals }, 'Transactions retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
}

export async function getTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
        group: { select: { id: true, name: true, code: true } },
        savingsAccount: { select: { id: true, accountType: true, balance: true } },
      },
    });
    if (!transaction) throw new AppError('Transaction not found', 404);
    sendSuccess(res, transaction, 'Transaction retrieved');
  } catch (err) {
    next(err);
  }
}
