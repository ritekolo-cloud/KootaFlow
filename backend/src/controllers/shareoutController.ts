import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getShareOuts = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const whereClause = user?.role === 'MEMBER' && user?.email 
      ? { Member: { email: user.email } } 
      : {};

    const shareOuts = await prisma.shareOut.findMany({
      where: whereClause,
      include: {
        Member: {
          include: {
            Group: true
          }
        },
      }
    });
    sendSuccess(res, shareOuts);
  } catch (error) {
    sendError(res, 'Error fetching share-outs', 500);
  }
};

export const calculateShareOut = async (req: Request, res: Response) => {
  try {
    const { groupId, totalAvailableShareOut } = req.body;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        Members: {
          include: { Savings: true }
        }
      }
    });

    if (!group) return sendError(res, 'Group not found', 404);

    // Calculate group total savings
    let groupTotalSavings = 0;
    const memberSavings: { [key: string]: number } = {};

    group.Members.forEach(member => {
      const memberTotal = member.Savings.reduce((sum, s) => sum + s.amount, 0);
      memberSavings[member.id] = memberTotal;
      groupTotalSavings += memberTotal;
    });

    if (groupTotalSavings === 0) {
      return sendError(res, 'Group has no savings to share out', 400);
    }

    const availableAmount = parseFloat(totalAvailableShareOut);

    const results = [];
    for (const member of group.Members) {
      const memberTotal = memberSavings[member.id];
      if (memberTotal > 0) {
        const shareAmount = (memberTotal / groupTotalSavings) * availableAmount;
        
        // Save share-out record
        const shareOutRecord = await prisma.shareOut.create({
          data: {
            memberId: member.id,
            cycleId: group.id, // using group ID as proxy for cycle for now
            totalSavings: memberTotal,
            shareAmount,
          }
        });
        results.push(shareOutRecord);
      }
    }

    sendSuccess(res, results, 201);
  } catch (error) {
    sendError(res, 'Error calculating share-outs', 500);
  }
};
