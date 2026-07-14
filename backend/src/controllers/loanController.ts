import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getLoans = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const whereClause = user?.role === 'MEMBER' && user?.email 
      ? { Member: { email: user.email } } 
      : {};

    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        Member: true,
        Repayments: true,
      },
      orderBy: { loanDate: 'desc' }
    });
    
    // Calculate total repayment expected for each loan
    const loansWithTotals = loans.map(loan => {
      const totalRepayable = loan.amount + (loan.amount * (loan.interestRate / 100));
      const amountPaid = loan.Repayments.reduce((sum, r) => sum + r.amountPaid, 0);
      return {
        ...loan,
        totalRepayable,
        amountPaid,
        remainingBalance: totalRepayable - amountPaid
      };
    });

    sendSuccess(res, loansWithTotals);
  } catch (error) {
    sendError(res, 'Error fetching loans', 500);
  }
};

export const createLoan = async (req: Request, res: Response) => {
  try {
    const { memberId, amount, interestRate, dueDate } = req.body;

    const loan = await prisma.loan.create({
      data: {
        memberId,
        amount: parseFloat(amount),
        interestRate: parseFloat(interestRate),
        dueDate: new Date(dueDate),
        status: 'ACTIVE',
      },
    });

    sendSuccess(res, loan, 201);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error creating loan', 500);
  }
};

export const updateLoan = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const loan = await prisma.loan.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    sendSuccess(res, loan);
  } catch (error) {
    sendError(res, 'Error updating loan', 500);
  }
};
