import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { generateTokens, verifyRefreshToken, generateResetToken, verifyResetToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { sendEmail, getBrandedTemplate } from '../utils/email';

export const setupAdmin = async (req: Request, res: Response) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return sendError(res, 'Setup is already complete', 403);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    sendSuccess(res, { user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 201);
  } catch (error) {
    console.error('Setup error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const tokens = generateTokens({ userId: user.id, role: user.role, email: user.email });

    sendSuccess(res, {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return sendError(res, 'Refresh token required', 400);
    }

    const payload = verifyRefreshToken(refreshToken);
    const tokens = generateTokens({ userId: payload.userId, role: payload.role, email: payload.email });

    sendSuccess(res, tokens);
  } catch (error) {
    sendError(res, 'Invalid refresh token', 401);
  }
};

export const logout = async (req: Request, res: Response) => {
  // In a real app, you might want to invalidate the refresh token in the DB or Redis
  sendSuccess(res, { message: 'Logged out successfully' });
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return sendError(res, 'Invalid current password', 400);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Send confirmation email
    const bodyText = `Hi ${user.name},\n\nYour KootaFlow password was changed successfully. If you did not perform this change, please contact a system administrator immediately.`;
    const bodyHtml = getBrandedTemplate(
      'Password Changed Successfully',
      `<p>Hi ${user.name},</p>
       <p>Your KootaFlow password was changed successfully from your account settings.</p>
       <p><strong>If you did not perform this change, please contact a system administrator immediately.</strong></p>`
    );
    const emailResult = await sendEmail(user.email, 'KootaFlow Security Alert: Password Changed', bodyText, bodyHtml);

    sendSuccess(res, { 
      message: 'Password updated successfully',
      warning: emailResult.success ? undefined : 'Security notification email failed to send.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) {
      return sendError(res, 'Email address is required', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success to prevent email enumeration, but log it
      console.log(`[AUTH forgotPassword] Forgot password request for non-existent user email: ${email}`);
      return sendSuccess(res, { message: 'If an account exists for that email, a recovery link has been sent.' });
    }

    const token = generateResetToken(user.id);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/?token=${token}`;

    const bodyText = `Hi ${user.name},\n\nYou requested to reset your KootaFlow password. Please click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes. If you did not make this request, you can safely ignore this email.`;
    
    const bodyHtml = getBrandedTemplate(
      'Password Reset Request',
      `<p>Hi ${user.name},</p>
       <p>You requested to reset your KootaFlow password. Please click the button below to set a new password:</p>
       <p>This link will expire in 15 minutes. If you did not make this request, you can safely ignore this email.</p>`,
      'Reset Password',
      resetUrl
    );

    const emailResult = await sendEmail(user.email, 'KootaFlow Password Recovery', bodyText, bodyHtml);
    if (!emailResult.success) {
      return sendError(res, 'Failed to send recovery email. Please contact support.', 500);
    }

    sendSuccess(res, { message: 'If an account exists for that email, a recovery link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return sendError(res, 'Token and new password are required', 400);
    }

    let payload;
    try {
      payload = verifyResetToken(token);
    } catch (err: any) {
      return sendError(res, 'Your recovery link is invalid or has expired. Please request a new one.', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Send confirmation email
    const bodyText = `Hi ${user.name},\n\nYour KootaFlow password has been successfully reset. If you did not perform this change, please contact a system administrator immediately.`;
    
    const bodyHtml = getBrandedTemplate(
      'Password Reset Confirmation',
      `<p>Hi ${user.name},</p>
       <p>Your KootaFlow password has been successfully reset.</p>
       <p><strong>If you did not perform this change, please contact a system administrator immediately.</strong></p>`
    );

    await sendEmail(user.email, 'KootaFlow Security Alert: Password Reset Successful', bodyText, bodyHtml);

    sendSuccess(res, { message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    sendError(res, 'Internal server error', 500);
  }
};
