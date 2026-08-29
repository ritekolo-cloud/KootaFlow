import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../config/jwt';
import { prisma } from '../config/database';
import { AppError } from './error.middleware';
import { UserRole, MemberStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  isActive: boolean;
  memberProfile?: {
    id: number;
    memberNumber: string;
    groupId: number;
    status: MemberStatus;
  } | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Authenticate via Bearer JWT. Attaches req.user with role and memberProfile on success.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: parseInt(payload.userId, 10) },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        memberProfile: {
          select: {
            id: true,
            memberNumber: true,
            groupId: true,
            status: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Account not found or inactive', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require specific roles. Must be used AFTER authenticate().
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}

/**
 * Clean 3-role guards:
 * - ADMIN: System and group management, loan approvals, share-out, users.
 * - TREASURER: Operational financial actions (deposits, withdrawals, share entries, loan repayments).
 * - STAFF (ADMIN + TREASURER): Shared operational oversight.
 */
export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireTreasurer = requireRole(UserRole.ADMIN, UserRole.TREASURER);
export const requireStaff = requireRole(UserRole.ADMIN, UserRole.TREASURER);
