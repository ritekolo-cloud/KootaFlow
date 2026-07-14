"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.logout = exports.refresh = exports.login = exports.setupAdmin = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const email_1 = require("../utils/email");
const setupAdmin = async (req, res) => {
    try {
        const { name, password } = req.body;
        const email = req.body.email.toLowerCase().trim();
        const userCount = await prisma_1.prisma.user.count();
        if (userCount > 0) {
            return (0, response_1.sendError)(res, 'Setup is already complete', 403);
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'ADMIN',
                status: 'ACTIVE',
            },
        });
        (0, response_1.sendSuccess)(res, { user: { id: user.id, name: user.name, email: user.email, role: user.role } }, 201);
    }
    catch (error) {
        console.error('Setup error:', error);
        (0, response_1.sendError)(res, 'Internal server error', 500);
    }
};
exports.setupAdmin = setupAdmin;
const login = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.body.email.toLowerCase().trim();
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return (0, response_1.sendError)(res, 'Invalid credentials', 401);
        }
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            return (0, response_1.sendError)(res, 'Invalid credentials', 401);
        }
        const tokens = (0, jwt_1.generateTokens)({ userId: user.id, role: user.role, email: user.email });
        (0, response_1.sendSuccess)(res, {
            ...tokens,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        (0, response_1.sendError)(res, 'Internal server error', 500);
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return (0, response_1.sendError)(res, 'Refresh token required', 400);
        }
        const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
        const tokens = (0, jwt_1.generateTokens)({ userId: payload.userId, role: payload.role, email: payload.email });
        (0, response_1.sendSuccess)(res, tokens);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Invalid refresh token', 401);
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    // In a real app, you might want to invalidate the refresh token in the DB or Redis
    (0, response_1.sendSuccess)(res, { message: 'Logged out successfully' });
};
exports.logout = logout;
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return (0, response_1.sendError)(res, 'Unauthorized', 401);
        }
        if (!currentPassword || !newPassword) {
            return (0, response_1.sendError)(res, 'Current password and new password are required', 400);
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return (0, response_1.sendError)(res, 'User not found', 404);
        }
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return (0, response_1.sendError)(res, 'Invalid current password', 400);
        }
        const hashedNewPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });
        // Send confirmation email
        const bodyText = `Hi ${user.name},\n\nYour KootaFlow password was changed successfully. If you did not perform this change, please contact a system administrator immediately.`;
        const bodyHtml = (0, email_1.getBrandedTemplate)('Password Changed Successfully', `<p>Hi ${user.name},</p>
       <p>Your KootaFlow password was changed successfully from your account settings.</p>
       <p><strong>If you did not perform this change, please contact a system administrator immediately.</strong></p>`);
        const emailResult = await (0, email_1.sendEmail)(user.email, 'KootaFlow Security Alert: Password Changed', bodyText, bodyHtml);
        (0, response_1.sendSuccess)(res, {
            message: 'Password updated successfully',
            warning: emailResult.success ? undefined : 'Security notification email failed to send.'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        (0, response_1.sendError)(res, 'Internal server error', 500);
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email?.toLowerCase().trim();
        if (!email) {
            return (0, response_1.sendError)(res, 'Email address is required', 400);
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Return success to prevent email enumeration, but log it
            console.log(`[AUTH forgotPassword] Forgot password request for non-existent user email: ${email}`);
            return (0, response_1.sendSuccess)(res, { message: 'If an account exists for that email, a recovery link has been sent.' });
        }
        const token = (0, jwt_1.generateResetToken)(user.id);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/?token=${token}`;
        const bodyText = `Hi ${user.name},\n\nYou requested to reset your KootaFlow password. Please click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes. If you did not make this request, you can safely ignore this email.`;
        const bodyHtml = (0, email_1.getBrandedTemplate)('Password Reset Request', `<p>Hi ${user.name},</p>
       <p>You requested to reset your KootaFlow password. Please click the button below to set a new password:</p>
       <p>This link will expire in 15 minutes. If you did not make this request, you can safely ignore this email.</p>`, 'Reset Password', resetUrl);
        const emailResult = await (0, email_1.sendEmail)(user.email, 'KootaFlow Password Recovery', bodyText, bodyHtml);
        if (!emailResult.success) {
            return (0, response_1.sendError)(res, 'Failed to send recovery email. Please contact support.', 500);
        }
        (0, response_1.sendSuccess)(res, { message: 'If an account exists for that email, a recovery link has been sent.' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        (0, response_1.sendError)(res, 'Internal server error', 500);
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return (0, response_1.sendError)(res, 'Token and new password are required', 400);
        }
        let payload;
        try {
            payload = (0, jwt_1.verifyResetToken)(token);
        }
        catch (err) {
            return (0, response_1.sendError)(res, 'Your recovery link is invalid or has expired. Please request a new one.', 400);
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.userId } });
        if (!user) {
            return (0, response_1.sendError)(res, 'User not found', 404);
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        // Send confirmation email
        const bodyText = `Hi ${user.name},\n\nYour KootaFlow password has been successfully reset. If you did not perform this change, please contact a system administrator immediately.`;
        const bodyHtml = (0, email_1.getBrandedTemplate)('Password Reset Confirmation', `<p>Hi ${user.name},</p>
       <p>Your KootaFlow password has been successfully reset.</p>
       <p><strong>If you did not perform this change, please contact a system administrator immediately.</strong></p>`);
        await (0, email_1.sendEmail)(user.email, 'KootaFlow Security Alert: Password Reset Successful', bodyText, bodyHtml);
        (0, response_1.sendSuccess)(res, { message: 'Password has been reset successfully. You can now log in.' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        (0, response_1.sendError)(res, 'Internal server error', 500);
    }
};
exports.resetPassword = resetPassword;
