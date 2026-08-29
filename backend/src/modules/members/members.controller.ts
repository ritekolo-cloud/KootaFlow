import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { MemberStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated, parsePagination, buildPaginationMeta } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const memberSchema = z.object({
  groupId: z.number().int().positive(),
  memberNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  nationalId: z.string().optional(),
  userId: z.number().int().positive().optional(),
  joinedAt: z.string().datetime().optional(),
});

const updateMemberSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  nationalId: z.string().optional(),
  status: z.nativeEnum(MemberStatus).optional(),
  userId: z.number().int().positive().nullable().optional(),
});

export async function listMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;
    const search = req.query.search as string | undefined;
    const status = req.query.status as MemberStatus | undefined;

    const where: Record<string, unknown> = {};
    if (groupId) where.groupId = groupId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { memberNumber: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { memberNumber: 'asc' },
        include: {
          group: { select: { id: true, name: true, code: true } },
          _count: { select: { loans: true, shares: true } },
        },
      }),
      prisma.member.count({ where }),
    ]);

    sendSuccess(res, members, 'Members retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
}

export async function getMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    // Strict Privacy Guard: If authenticated as MEMBER, verify viewing own profile
    if (req.user?.role === 'MEMBER' && req.user.memberProfile?.id !== id) {
      throw new AppError('Access denied: You can only view your own member profile', 403);
    }

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        group: { select: { id: true, name: true, code: true, sharePrice: true, maxSharesPerMember: true, loanInterestRate: true } },
        savingsAccounts: true,
        shares: { orderBy: { purchaseDate: 'desc' } },
        loans: { orderBy: { createdAt: 'desc' }, include: { repayments: { orderBy: { paymentDate: 'desc' }, take: 5 } } },
        user: { select: { id: true, email: true, role: true } },
      },
    });
    if (!member) throw new AppError('Member not found', 404);
    sendSuccess(res, member, 'Member retrieved');
  } catch (err) {
    next(err);
  }
}

export async function createMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = memberSchema.parse(req.body);

    // Validate group exists
    const group = await prisma.vslaGroup.findUnique({ where: { id: data.groupId } });
    if (!group) throw new AppError('VSLA Group not found', 404);

    // Ensure member number is unique within group
    const existing = await prisma.member.findUnique({
      where: { groupId_memberNumber: { groupId: data.groupId, memberNumber: data.memberNumber } },
    });
    if (existing) throw new AppError(`Member number ${data.memberNumber} already exists in this group`, 409);

    const member = await prisma.member.create({
      data: {
        ...data,
        joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
      },
      include: { group: { select: { id: true, name: true, code: true } } },
    });

    // Auto-create a voluntary savings account
    await prisma.savingsAccount.create({
      data: { memberId: member.id, accountType: 'VOLUNTARY', balance: 0 },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'CREATE_MEMBER', entity: 'Member', entityId: member.id, details: { memberNumber: member.memberNumber, groupId: member.groupId } },
    });

    sendCreated(res, member, 'Member created');
  } catch (err) {
    next(err);
  }
}

export async function updateMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const data = updateMemberSchema.parse(req.body);

    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) throw new AppError('Member not found', 404);

    // If linking to a user, ensure that user isn't already linked to another member
    if (data.userId) {
      const existingLink = await prisma.member.findFirst({
        where: { userId: data.userId, id: { not: id } },
      });
      if (existingLink) throw new AppError('This user account is already linked to another member', 409);
    }

    const updated = await prisma.member.update({ where: { id }, data });
    sendSuccess(res, updated, 'Member updated');
  } catch (err) {
    next(err);
  }
}

export async function getMemberLedger(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);

    // Strict Privacy Guard: If authenticated as MEMBER, verify viewing own ledger
    if (req.user?.role === 'MEMBER' && req.user.memberProfile?.id !== id) {
      throw new AppError('Access denied: You can only view your own ledger', 403);
    }

    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);

    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) throw new AppError('Member not found', 404);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { memberId: id },
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.transaction.count({ where: { memberId: id } }),
    ]);

    sendSuccess(res, transactions, 'Member ledger retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
}
