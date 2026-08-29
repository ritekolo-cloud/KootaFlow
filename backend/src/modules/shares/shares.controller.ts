import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const purchaseSharesSchema = z.object({
  memberId: z.number().int().positive(),
  cycleId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  purchaseDate: z.string().datetime().optional(),
});

export async function getSharesForMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const memberId = parseInt(req.params.memberId, 10);

    // Privacy Guard: If authenticated as MEMBER, can only view own shares
    if (req.user?.role === 'MEMBER' && req.user.memberProfile?.id !== memberId) {
      throw new AppError('Access denied: You can only view your own shareholdings', 403);
    }

    const cycleId = req.query.cycleId ? parseInt(req.query.cycleId as string, 10) : undefined;

    const where: Record<string, unknown> = { memberId };
    if (cycleId) where.cycleId = cycleId;

    const shares = await prisma.share.findMany({
      where,
      orderBy: { purchaseDate: 'desc' },
      include: { cycle: { select: { id: true, cycleNumber: true, status: true } } },
    });

    const totalShares = shares.reduce((sum, s) => sum + s.quantity, 0);
    const totalValue = shares.reduce((sum, s) => sum + Number(s.totalAmount), 0);

    sendSuccess(res, { shares, summary: { totalShares, totalValue } }, 'Shares retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getSharesSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;
    const cycleId = req.query.cycleId ? parseInt(req.query.cycleId as string, 10) : undefined;

    const where: Record<string, unknown> = {};
    if (cycleId) where.cycleId = cycleId;
    if (groupId) where.member = { groupId };

    const [shares, memberCount] = await Promise.all([
      prisma.share.findMany({ where }),
      groupId ? prisma.member.count({ where: { groupId, status: 'ACTIVE' } }) : Promise.resolve(0),
    ]);

    const totalShares = shares.reduce((sum, s) => sum + s.quantity, 0);
    const totalValue = shares.reduce((sum, s) => sum + Number(s.totalAmount), 0);

    sendSuccess(res, { totalShares, totalValue, memberCount, shareRecords: shares.length }, 'Share summary retrieved');
  } catch (err) {
    next(err);
  }
}

export async function purchaseShares(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = purchaseSharesSchema.parse(req.body);

    // Validate member and group
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      include: { group: true },
    });
    if (!member) throw new AppError('Member not found', 404);
    if (member.status !== 'ACTIVE') throw new AppError('Member is not active', 400);

    // Validate cycle belongs to member's group and is active
    const cycle = await prisma.cycle.findUnique({ where: { id: data.cycleId } });
    if (!cycle) throw new AppError('Cycle not found', 404);
    if (cycle.groupId !== member.groupId) throw new AppError('Cycle does not belong to member group', 400);
    if (cycle.status !== 'ACTIVE') throw new AppError('Shares can only be purchased in an active cycle', 400);

    // Enforce max shares per member per cycle
    const existingShares = await prisma.share.findMany({
      where: { memberId: data.memberId, cycleId: data.cycleId },
    });
    const currentTotal = existingShares.reduce((sum, s) => sum + s.quantity, 0);
    const newTotal = currentTotal + data.quantity;

    if (newTotal > member.group.maxSharesPerMember) {
      throw new AppError(
        `Share limit exceeded. Member has ${currentTotal} shares. Max allowed: ${member.group.maxSharesPerMember}. Requested: ${data.quantity}`,
        400
      );
    }

    const pricePerShare = Number(member.group.sharePrice);
    const totalAmount = pricePerShare * data.quantity;

    // Use a transaction for atomicity
    const [share] = await prisma.$transaction([
      prisma.share.create({
        data: {
          memberId: data.memberId,
          cycleId: data.cycleId,
          quantity: data.quantity,
          pricePerShare,
          totalAmount,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        },
      }),
      prisma.transaction.create({
        data: {
          groupId: member.groupId,
          memberId: data.memberId,
          type: TransactionType.SHARE_PURCHASE,
          amount: totalAmount,
          description: `Share purchase: ${data.quantity} share(s) @ ${pricePerShare} each`,
          transactionDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'SHARE_PURCHASE',
        entity: 'Share',
        entityId: share.id,
        details: { memberId: data.memberId, quantity: data.quantity, totalAmount, cycleId: data.cycleId },
      },
    });

    sendCreated(res, { share, totalAmount }, 'Shares purchased successfully');
  } catch (err) {
    next(err);
  }
}
