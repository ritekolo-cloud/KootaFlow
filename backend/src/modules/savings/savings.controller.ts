import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const depositSchema = z.object({
  memberId: z.number().int().positive(),
  amount: z.number().positive('Amount must be positive'),
  accountType: z.string().default('VOLUNTARY'),
  description: z.string().optional(),
  transactionDate: z.string().datetime().optional(),
});

const withdrawSchema = z.object({
  memberId: z.number().int().positive(),
  amount: z.number().positive('Amount must be positive'),
  accountType: z.string().default('VOLUNTARY'),
  description: z.string().optional(),
  transactionDate: z.string().datetime().optional(),
});

async function getOrCreateAccount(memberId: number, accountType: string) {
  return prisma.savingsAccount.upsert({
    where: { memberId_accountType: { memberId, accountType } },
    create: { memberId, accountType, balance: 0 },
    update: {},
  });
}

export async function getSavingsAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new AppError('Member not found', 404);

    const accounts = await prisma.savingsAccount.findMany({
      where: { memberId },
      include: {
        transactions: { orderBy: { transactionDate: 'desc' }, take: 10 },
      },
    });
    sendSuccess(res, accounts, 'Savings accounts retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getSavingsSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;

    const accounts = await prisma.savingsAccount.findMany({
      where: groupId ? { member: { groupId } } : {},
    });

    const totalSavings = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    sendSuccess(res, { totalSavings, accountCount: accounts.length }, 'Savings summary retrieved');
  } catch (err) {
    next(err);
  }
}

export async function deposit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = depositSchema.parse(req.body);

    const member = await prisma.member.findUnique({ where: { id: data.memberId } });
    if (!member) throw new AppError('Member not found', 404);
    if (member.status !== 'ACTIVE') throw new AppError('Member is not active', 400);

    const account = await getOrCreateAccount(data.memberId, data.accountType);
    const newBalance = Number(account.balance) + data.amount;

    const [updatedAccount, txn] = await prisma.$transaction([
      prisma.savingsAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      }),
      prisma.transaction.create({
        data: {
          groupId: member.groupId,
          memberId: data.memberId,
          savingsAccountId: account.id,
          type: TransactionType.SAVINGS_DEPOSIT,
          amount: data.amount,
          balanceAfter: newBalance,
          description: data.description ?? 'Savings deposit',
          transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'SAVINGS_DEPOSIT',
        entity: 'SavingsAccount',
        entityId: account.id,
        details: { memberId: data.memberId, amount: data.amount, newBalance },
      },
    });

    sendCreated(res, { account: updatedAccount, transaction: txn }, 'Deposit recorded successfully');
  } catch (err) {
    next(err);
  }
}

export async function withdraw(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = withdrawSchema.parse(req.body);

    const member = await prisma.member.findUnique({ where: { id: data.memberId } });
    if (!member) throw new AppError('Member not found', 404);
    if (member.status !== 'ACTIVE') throw new AppError('Member is not active', 400);

    const account = await prisma.savingsAccount.findUnique({
      where: { memberId_accountType: { memberId: data.memberId, accountType: data.accountType } },
    });
    if (!account) throw new AppError('Savings account not found', 404);

    const currentBalance = Number(account.balance);
    if (data.amount > currentBalance) {
      throw new AppError(
        `Insufficient savings balance. Available: ${currentBalance}, Requested: ${data.amount}`,
        400
      );
    }

    const newBalance = currentBalance - data.amount;

    const [updatedAccount, txn] = await prisma.$transaction([
      prisma.savingsAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      }),
      prisma.transaction.create({
        data: {
          groupId: member.groupId,
          memberId: data.memberId,
          savingsAccountId: account.id,
          type: TransactionType.SAVINGS_WITHDRAWAL,
          amount: data.amount,
          balanceAfter: newBalance,
          description: data.description ?? 'Savings withdrawal',
          transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'SAVINGS_WITHDRAWAL',
        entity: 'SavingsAccount',
        entityId: account.id,
        details: { memberId: data.memberId, amount: data.amount, newBalance },
      },
    });

    sendCreated(res, { account: updatedAccount, transaction: txn }, 'Withdrawal recorded successfully');
  } catch (err) {
    next(err);
  }
}
