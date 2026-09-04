import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { signAccessToken } from '../../config/jwt';
import { comparePassword, hashPassword } from '../../utils/hash';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// ─── Login ────────────────────────────────────────────────────────────────
export async function login(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
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
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = signAccessToken({
      userId: String(user.id),
      email: user.email,
      role: user.role,
    });

    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const refreshHash = hashToken(rawRefresh);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    logger.info(`User logged in: ${user.email}`);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        details: { ip: req.ip },
      },
    });

    sendSuccess(
      res,
      {
        accessToken,
        refreshToken: rawRefresh,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          memberProfile: user.memberProfile,
        },
      },
      'Login successful'
    );
  } catch (err) {
    next(err);
  }
}

// ─── Refresh (Unified & Rotated) ──────────────────────────────────────────
export async function refresh(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const tokenHash = hashToken(refreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.revokedAt !== null ||
      tokenRecord.expiresAt.getTime() < Date.now()
    ) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    if (!tokenRecord.user || !tokenRecord.user.isActive) {
      throw new AppError('Account is inactive or disabled', 401);
    }

    // Revoke old token record (Rotation)
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Create new refresh token
    const newRawRefresh = crypto.randomBytes(40).toString('hex');
    const newRefreshHash = hashToken(newRawRefresh);

    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.user.id,
        tokenHash: newRefreshHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Issue new access token
    const newAccessToken = signAccessToken({
      userId: String(tokenRecord.user.id),
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
    });

    sendSuccess(
      res,
      {
        accessToken: newAccessToken,
        refreshToken: newRawRefresh,
      },
      'Token refreshed successfully'
    );
  } catch (err) {
    next(err);
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────
export async function logout(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, userId: req.user!.id },
        data: { revokedAt: new Date() },
      });
    }
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

// ─── Me ───────────────────────────────────────────────────────────────────
export async function me(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
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
    if (!user) throw new AppError('User not found', 404);
    sendSuccess(res, user, 'User profile retrieved');
  } catch (err) {
    next(err);
  }
}

// ─── Change Password ──────────────────────────────────────────────────────
export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found', 404);

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Revoke all active refresh tokens for this user on password change
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CHANGE_PASSWORD',
        entity: 'User',
        entityId: user.id,
      },
    });

    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}
