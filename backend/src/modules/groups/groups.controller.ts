import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { MeetingFrequency, CycleStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated, parsePagination, buildPaginationMeta } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const groupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2).max(20).toUpperCase(),
  description: z.string().optional(),
  meetingFrequency: z.nativeEnum(MeetingFrequency).default(MeetingFrequency.WEEKLY),
  sharePrice: z.number().positive('Share price must be positive'),
  maxSharesPerMember: z.number().int().min(1).max(20),
  loanInterestRate: z.number().min(0).max(100),
  maxLoanDurationMonths: z.number().int().min(1).max(24),
  welfareContribution: z.number().min(0),
});

const cycleSchema = z.object({
  cycleNumber: z.number().int().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  status: z.nativeEnum(CycleStatus).default(CycleStatus.ACTIVE),
});

// ─── Groups ───────────────────────────────────────────────────────────────

export async function listGroups(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const [groups, total] = await Promise.all([
      prisma.vslaGroup.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { members: true, cycles: true } },
          cycles: { where: { status: CycleStatus.ACTIVE }, take: 1, orderBy: { cycleNumber: 'desc' } },
        },
      }),
      prisma.vslaGroup.count(),
    ]);
    sendSuccess(res, groups, 'Groups retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
}

export async function getGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const group = await prisma.vslaGroup.findUnique({
      where: { id },
      include: {
        cycles: { orderBy: { cycleNumber: 'desc' } },
        _count: { select: { members: true } },
      },
    });
    if (!group) throw new AppError('Group not found', 404);
    sendSuccess(res, group, 'Group retrieved');
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = groupSchema.parse(req.body);
    const group = await prisma.vslaGroup.create({ data });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'CREATE_GROUP', entity: 'VslaGroup', entityId: group.id, details: { code: group.code } as object },
    });
    sendCreated(res, group, 'VSLA Group created');
  } catch (err) {
    next(err);
  }
}

export async function updateGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const data = groupSchema.partial().parse(req.body);
    const group = await prisma.vslaGroup.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'UPDATE_GROUP', entity: 'VslaGroup', entityId: id, details: data as object },
    });
    sendSuccess(res, group, 'Group updated');
  } catch (err) {
    next(err);
  }
}

// ─── Cycles ───────────────────────────────────────────────────────────────

export async function listCycles(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const cycles = await prisma.cycle.findMany({
      where: { groupId },
      orderBy: { cycleNumber: 'desc' },
    });
    sendSuccess(res, cycles, 'Cycles retrieved');
  } catch (err) {
    next(err);
  }
}

export async function createCycle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const data = cycleSchema.parse(req.body);

    // Ensure no duplicate cycle number
    const existing = await prisma.cycle.findUnique({
      where: { groupId_cycleNumber: { groupId, cycleNumber: data.cycleNumber } },
    });
    if (existing) throw new AppError(`Cycle #${data.cycleNumber} already exists for this group`, 409);

    // If new cycle is ACTIVE, complete any other active cycle first
    if (data.status === CycleStatus.ACTIVE) {
      await prisma.cycle.updateMany({
        where: { groupId, status: CycleStatus.ACTIVE },
        data: { status: CycleStatus.COMPLETED, endDate: new Date() },
      });
    }

    const cycle = await prisma.cycle.create({ data: { ...data, groupId, startDate: new Date(data.startDate), endDate: data.endDate ? new Date(data.endDate) : undefined } });
    sendCreated(res, cycle, 'Cycle created');
  } catch (err) {
    next(err);
  }
}

export async function updateCycle(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupId = parseInt(req.params.groupId, 10);
    const cycleId = parseInt(req.params.cycleId, 10);
    const data = cycleSchema.partial().parse(req.body);

    const cycle = await prisma.cycle.findFirst({ where: { id: cycleId, groupId } });
    if (!cycle) throw new AppError('Cycle not found', 404);

    // If completing a cycle, ensure share-out was done first
    if (data.status === CycleStatus.COMPLETED) {
      const shareOut = await prisma.shareOut.findFirst({ where: { cycleId } });
      if (!shareOut) throw new AppError('Cannot complete a cycle without performing share-out first', 400);
    }

    const updated = await prisma.cycle.update({
      where: { id: cycleId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    sendSuccess(res, updated, 'Cycle updated');
  } catch (err) {
    next(err);
  }
}
