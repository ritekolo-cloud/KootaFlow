import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/authMiddleware';

export const getSavings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const whereClause = user?.role === 'MEMBER' && user?.email 
      ? { Member: { email: user.email } } 
      : {};

    const savings = await prisma.saving.findMany({
      where: whereClause,
      include: {
        Member: true,
      },
      orderBy: { savingDate: 'desc' }
    });
    sendSuccess(res, savings);
  } catch (error) {
    sendError(res, 'Error fetching savings', 500);
  }
};

export const createSaving = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId, amount, savingDate } = req.body;
    
    const saving = await prisma.saving.create({
      data: {
        memberId,
        amount: parseFloat(amount),
        savingDate: savingDate ? new Date(savingDate) : new Date(),
        recordedBy: req.user?.userId || 'system',
      },
    });
    sendSuccess(res, saving, 201);
  } catch (error) {
    sendError(res, 'Error recording saving', 500);
  }
};
