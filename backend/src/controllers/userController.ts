import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { sendEmail, getBrandedTemplate } from '../utils/email';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    sendSuccess(res, users);
  } catch (error) {
    sendError(res, 'Error fetching users', 500);
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, password, role } = req.body;
    const email = req.body.email.toLowerCase().trim();
    const createdBy = (req as any).user?.userId || 'SYSTEM';

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return sendError(res, 'User already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        status: 'ACTIVE',
        createdBy,
      },
    });

    const bodyText = `Hi ${name},\n\nWelcome to KootaFlow!\n\nYour account has been successfully created.\nSystem Role: ${role}\nPassword: ${password}\n\nPlease sign in to your dashboard to get started.`;
    const bodyHtml = getBrandedTemplate(
      'Welcome to KootaFlow',
      `<p>Hi ${name},</p>
       <p>Welcome to KootaFlow! Your account has been successfully created.</p>
       <p><strong>System Role:</strong> ${role}</p>
       <p><strong>Password:</strong> ${password}</p>
       <p>Please sign in to your dashboard to get started.</p>`
    );

    const emailResult = await sendEmail(email, 'Welcome to KootaFlow', bodyText, bodyHtml);

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      emailSent: emailResult.success,
      warning: emailResult.success ? undefined : 'Welcome email could not be delivered. Please share credentials manually.'
    }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, 'Internal server error', 500);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body;
    const email = req.body.email.toLowerCase().trim();
    
    const user = await prisma.user.update({
      where: { id: id as string },
      data: { name, email, role, status },
    });

    sendSuccess(res, { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status });
  } catch (error) {
    sendError(res, 'Error updating user', 500);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id: id as string },
      data: { password: hashedPassword },
    });

    const bodyText = `Hi ${user.name},\n\nAn administrator has reset your KootaFlow account password. Your new password is: ${newPassword}\n\nPlease sign in and change your password immediately.`;
    const bodyHtml = getBrandedTemplate(
      'Password Reset by Administrator',
      `<p>Hi ${user.name},</p>
       <p>An administrator has reset your KootaFlow account password.</p>
       <p><strong>New Password:</strong> ${newPassword}</p>
       <p>Please log in and change your password immediately from your account settings.</p>`
    );
    
    const emailResult = await sendEmail(user.email, 'KootaFlow Security Notification: Password Reset', bodyText, bodyHtml);

    sendSuccess(res, {
      message: 'Password reset successfully',
      emailSent: emailResult.success,
      warning: emailResult.success ? undefined : 'Security notification email failed to send.'
    });
  } catch (error) {
    sendError(res, 'Error resetting password', 500);
  }
};
