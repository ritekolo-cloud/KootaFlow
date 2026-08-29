import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { LoanStatus, TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated, parsePagination, buildPaginationMeta } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const applyLoanSchema = z.object({
  memberId: z.number().int().positive(),
  cycleId: z.number().int().positive(),
  principalAmount: z.number().positive('Principal must be positive'),
  durationMonths: z.number().int().min(1).max(24),
  purpose: z.string().min(3).max(500).optional(),
});

const repaySchema = z.object({
  amountPaid: z.number().positive('Payment amount must be positive'),
  paymentDate: z.string().datetime().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

export async function listLoans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const status = req.query.status as LoanStatus | undefined;
    const requestedMemberId = req.query.memberId ? parseInt(req.query.memberId as string, 10) : undefined;
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // Strict Privacy Guard: If authenticated as MEMBER, only allow viewing their own loans
    if (req.user?.role === 'MEMBER') {
      const ownMemberId = req.user.memberProfile?.id;
      if (!ownMemberId) throw new AppError('Member profile not linked to user', 400);
      where.memberId = ownMemberId;
    } else {
      if (requestedMemberId) where.memberId = requestedMemberId;
      if (groupId) where.member = { groupId };
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, memberNumber: true, groupId: true } },
          cycle: { select: { id: true, cycleNumber: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.loan.count({ where }),
    ]);

    sendSuccess(res, loans, 'Loans retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
}

export async function getLoan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
        cycle: { select: { id: true, cycleNumber: true, status: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        repayments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!loan) throw new AppError('Loan not found', 404);

    // Strict Privacy Guard: If authenticated as MEMBER, verify loan belongs to them
    if (req.user?.role === 'MEMBER' && req.user.memberProfile?.id !== loan.memberId) {
      throw new AppError('Access denied: You can only view your own loan records', 403);
    }

    sendSuccess(res, loan, 'Loan retrieved');
  } catch (err) {
    next(err);
  }
}

export async function applyLoan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = applyLoanSchema.parse(req.body);

    // Strict Privacy Guard: If authenticated as MEMBER, force their own memberId
    if (req.user?.role === 'MEMBER') {
      const ownMemberId = req.user.memberProfile?.id;
      if (!ownMemberId || data.memberId !== ownMemberId) {
        throw new AppError('Access denied: You can only apply for a loan for yourself', 403);
      }
    }

    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      include: { group: true },
    });
    if (!member) throw new AppError('Member not found', 404);
    if (member.status !== 'ACTIVE') throw new AppError('Member is not active', 400);

    // Validate cycle
    const cycle = await prisma.cycle.findUnique({ where: { id: data.cycleId } });
    if (!cycle) throw new AppError('Cycle not found', 404);
    if (cycle.groupId !== member.groupId) throw new AppError('Cycle does not belong to this member\'s group', 400);
    if (cycle.status !== 'ACTIVE') throw new AppError('Loans can only be applied in an active cycle', 400);

    // Prevent new loan if member has an active loan in same cycle
    const activeLoan = await prisma.loan.findFirst({
      where: { memberId: data.memberId, cycleId: data.cycleId, status: { in: [LoanStatus.ACTIVE, LoanStatus.APPROVED] } },
    });
    if (activeLoan) throw new AppError('Member already has an active or approved loan in this cycle', 409);

    // Enforce max loan duration
    if (data.durationMonths > member.group.maxLoanDurationMonths) {
      throw new AppError(`Loan duration exceeds group maximum of ${member.group.maxLoanDurationMonths} months`, 400);
    }

    // Calculate interest using group rate
    const interestRate = Number(member.group.loanInterestRate);
    const interestAmount = (data.principalAmount * interestRate) / 100;
    const totalRepayable = data.principalAmount + interestAmount;

    const loan = await prisma.loan.create({
      data: {
        memberId: data.memberId,
        cycleId: data.cycleId,
        principalAmount: data.principalAmount,
        interestRate,
        interestAmount,
        totalRepayable,
        balanceRemaining: totalRepayable,
        durationMonths: data.durationMonths,
        purpose: data.purpose,
        status: LoanStatus.PENDING,
      },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Notify officer/admin
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        title: 'New Loan Application',
        message: `${member.firstName} ${member.lastName} applied for a loan of ${data.principalAmount} for ${data.durationMonths} month(s).`,
        type: 'LOAN_APPLICATION',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'LOAN_APPLICATION',
        entity: 'Loan',
        entityId: loan.id,
        details: { memberId: data.memberId, principal: data.principalAmount, interestRate },
      },
    });

    sendCreated(res, loan, 'Loan application submitted');
  } catch (err) {
    next(err);
  }
}

export async function approveLoan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { member: { include: { group: true } } },
    });
    if (!loan) throw new AppError('Loan not found', 404);
    if (loan.status !== LoanStatus.PENDING) throw new AppError('Only pending loans can be approved', 400);

    const disbursedAt = new Date();
    const dueDate = new Date(disbursedAt);
    dueDate.setMonth(dueDate.getMonth() + loan.durationMonths);

    const [updatedLoan] = await prisma.$transaction([
      prisma.loan.update({
        where: { id },
        data: {
          status: LoanStatus.ACTIVE,
          approvedById: req.user!.id,
          approvedAt: new Date(),
          disbursedAt,
          dueDate,
        },
      }),
      prisma.transaction.create({
        data: {
          groupId: loan.member.groupId,
          memberId: loan.memberId,
          type: TransactionType.LOAN_DISBURSEMENT,
          amount: loan.principalAmount,
          description: `Loan disbursement for ${loan.member.firstName} ${loan.member.lastName}`,
          transactionDate: disbursedAt,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'LOAN_APPROVED',
        entity: 'Loan',
        entityId: id,
        details: { principalAmount: Number(loan.principalAmount), dueDate },
      },
    });

    // Notify member if linked
    if (loan.member.userId) {
      await prisma.notification.create({
        data: {
          userId: loan.member.userId,
          title: 'Loan Approved',
          message: `Your loan of ${loan.principalAmount} has been approved and disbursed. Due date: ${dueDate.toLocaleDateString()}.`,
          type: 'LOAN_APPROVED',
        },
      });
    }

    sendSuccess(res, updatedLoan, 'Loan approved and disbursed');
  } catch (err) {
    next(err);
  }
}

export async function rejectLoan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body as { reason?: string };
    const loan = await prisma.loan.findUnique({ where: { id }, include: { member: true } });
    if (!loan) throw new AppError('Loan not found', 404);
    if (loan.status !== LoanStatus.PENDING) throw new AppError('Only pending loans can be rejected', 400);

    const updated = await prisma.loan.update({
      where: { id },
      data: { status: LoanStatus.REJECTED, approvedById: req.user!.id, approvedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'LOAN_REJECTED',
        entity: 'Loan',
        entityId: id,
        details: { reason },
      },
    });

    if (loan.member.userId) {
      await prisma.notification.create({
        data: {
          userId: loan.member.userId,
          title: 'Loan Application Rejected',
          message: reason ? `Your loan application was rejected. Reason: ${reason}` : 'Your loan application was rejected.',
          type: 'LOAN_REJECTED',
        },
      });
    }

    sendSuccess(res, updated, 'Loan rejected');
  } catch (err) {
    next(err);
  }
}

export async function repayLoan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const data = repaySchema.parse(req.body);

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { member: { include: { group: true } } },
    });
    if (!loan) throw new AppError('Loan not found', 404);
    if (loan.status !== LoanStatus.ACTIVE) {
      throw new AppError('Repayments can only be made on active loans', 400);
    }

    const balanceRemaining = Number(loan.balanceRemaining);
    const amountPaid = data.amountPaid;

    if (amountPaid > balanceRemaining) {
      throw new AppError(
        `Payment amount (${amountPaid}) exceeds outstanding balance (${balanceRemaining}). Maximum repayment: ${balanceRemaining}`,
        400
      );
    }

    // Split into principal and interest portions proportionally
    const totalRepayable = Number(loan.totalRepayable);
    const interestAmount = Number(loan.interestAmount);
    const principalAmount = Number(loan.principalAmount);
    const interestFraction = totalRepayable > 0 ? interestAmount / totalRepayable : 0;
    const interestPortion = Math.round(amountPaid * interestFraction * 100) / 100;
    const principalPortion = amountPaid - interestPortion;
    const newBalance = Math.round((balanceRemaining - amountPaid) * 100) / 100;
    const isFullyPaid = newBalance <= 0;

    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

    const [repayment] = await prisma.$transaction([
      prisma.loanRepayment.create({
        data: {
          loanId: id,
          amountPaid,
          principalPortion,
          interestPortion,
          remainingBalance: newBalance,
          paymentDate,
          receiptNumber: data.receiptNumber,
          notes: data.notes,
        },
      }),
      prisma.loan.update({
        where: { id },
        data: {
          balanceRemaining: newBalance,
          status: isFullyPaid ? LoanStatus.PAID : LoanStatus.ACTIVE,
        },
      }),
      prisma.transaction.create({
        data: {
          groupId: loan.member.groupId,
          memberId: loan.memberId,
          type: TransactionType.LOAN_REPAYMENT,
          amount: amountPaid,
          description: `Loan repayment from ${loan.member.firstName} ${loan.member.lastName}${data.receiptNumber ? ` (${data.receiptNumber})` : ''}`,
          transactionDate: paymentDate,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'LOAN_REPAYMENT',
        entity: 'Loan',
        entityId: id,
        details: { amountPaid, newBalance, isFullyPaid },
      },
    });

    sendCreated(res, { repayment, newBalance, isFullyPaid }, isFullyPaid ? 'Loan fully repaid' : 'Repayment recorded');
  } catch (err) {
    next(err);
  }
}

export async function getLoanRepayments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new AppError('Loan not found', 404);

    // Strict Privacy Guard: If authenticated as MEMBER, verify loan belongs to them
    if (req.user?.role === 'MEMBER' && req.user.memberProfile?.id !== loan.memberId) {
      throw new AppError('Access denied: You can only view your own loan repayments', 403);
    }

    const repayments = await prisma.loanRepayment.findMany({
      where: { loanId: id },
      orderBy: { paymentDate: 'desc' },
    });
    sendSuccess(res, repayments, 'Loan repayments retrieved');
  } catch (err) {
    next(err);
  }
}
