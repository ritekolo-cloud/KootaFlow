import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { hashPassword } from '../../utils/hash';
import { sendSuccess, sendCreated, sendError, parsePagination, buildPaginationMeta } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.MEMBER),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

export async function listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const search = req.query.search as string | undefined;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, users, 'Users retrieved', 200, buildPaginationMeta(total, page, limit));
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, createdAt: true, memberProfile: true },
    });
    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, user, 'User retrieved');
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered', 409);
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: { ...data, passwordHash, password: undefined } as never,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'CREATE_USER', entity: 'User', entityId: user.id, details: { email: user.email, role: user.role } },
    });
    sendCreated(res, user, 'User created');
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const data = updateUserSchema.parse(req.body);
    // Prevent demoting the last super admin
    if (data.role && data.role !== UserRole.SUPER_ADMIN) {
      const target = await prisma.user.findUnique({ where: { id } });
      if (target?.role === UserRole.SUPER_ADMIN) {
        const adminCount = await prisma.user.count({ where: { role: UserRole.SUPER_ADMIN, isActive: true } });
        if (adminCount <= 1) throw new AppError('Cannot demote the only Super Admin', 400);
      }
    }
    const user = await prisma.user.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'UPDATE_USER', entity: 'User', entityId: id, details: data as object },
    });
    sendSuccess(res, user, 'User updated');
  } catch (err) {
    next(err);
  }
}

export async function deactivateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user!.id) throw new AppError('Cannot deactivate your own account', 400);
    const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, action: 'DEACTIVATE_USER', entity: 'User', entityId: id },
    });
    sendSuccess(res, { id: user.id }, 'User deactivated');
  } catch (err) {
    next(err);
  }
}
