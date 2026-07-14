import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getRepayments = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const whereClause = user?.role === 'MEMBER' && user?.email 
      ? { Loan: { Member: { email: user.email } } } 
      : {};

    const repayments = await prisma.repayment.findMany({
      where: whereClause,
      include: {
        Loan: {
          include: { Member: true }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });
    sendSuccess(res, repayments);
  } catch (error) {
    sendError(res, 'Error fetching repayments', 500);
  }
};

export const createRepayment = async (req: Request, res: Response) => {
  try {
    const { loanId, amountPaid } = req.body;
    
    // Find loan
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { Repayments: true }
    });

    if (!loan) return sendError(res, 'Loan not found', 404);

    const paymentAmount = parseFloat(amountPaid);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return sendError(res, 'Payment amount must be greater than 0', 400);
    }

    // Calculate current remaining balance before this payment
    const totalExpected = loan.amount + (loan.amount * (loan.interestRate / 100));
    const totalPaidSoFar = loan.Repayments.reduce((sum, r) => sum + r.amountPaid, 0);
    const remainingBefore = totalExpected - totalPaidSoFar;

    if (paymentAmount > remainingBefore) {
      return sendError(res, 'Payment amount cannot exceed remaining balance', 400);
    }

    const remainingBalance = remainingBefore - paymentAmount;

    const repayment = await prisma.repayment.create({
      data: {
        loanId,
        amountPaid: paymentAmount,
        remainingBalance: remainingBalance,
      },
    });

    // Update loan status if fully paid
    if (remainingBalance <= 0) {
      await prisma.loan.update({
        where: { id: loanId },
        data: { status: 'COMPLETED' }
      });
    }

    sendSuccess(res, repayment, 201);
  } catch (error) {
    sendError(res, 'Error recording repayment', 500);
  }
};
