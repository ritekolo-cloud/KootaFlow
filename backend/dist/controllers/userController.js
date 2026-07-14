"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const email_1 = require("../utils/email");
const getUsers = async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });
        (0, response_1.sendSuccess)(res, users);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error fetching users', 500);
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    try {
        const { name, password, role } = req.body;
        const email = req.body.email.toLowerCase().trim();
        const createdBy = req.user?.userId || 'SYSTEM';
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return (0, response_1.sendError)(res, 'User already exists', 400);
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
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
        const bodyHtml = (0, email_1.getBrandedTemplate)('Welcome to KootaFlow', `<p>Hi ${name},</p>
       <p>Welcome to KootaFlow! Your account has been successfully created.</p>
       <p><strong>System Role:</strong> ${role}</p>
       <p><strong>Password:</strong> ${password}</p>
       <p>Please sign in to your dashboard to get started.</p>`);
        const emailResult = await (0, email_1.sendEmail)(email, 'Welcome to KootaFlow', bodyText, bodyHtml);
        (0, response_1.sendSuccess)(res, {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            emailSent: emailResult.success,
            warning: emailResult.success ? undefined : 'Welcome email could not be delivered. Please share credentials manually.'
        }, 201);
    }
    catch (error) {
        console.error('Create user error:', error);
        (0, response_1.sendError)(res, 'Internal server error', 500);
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, status } = req.body;
        const email = req.body.email.toLowerCase().trim();
        const user = await prisma_1.prisma.user.update({
            where: { id: id },
            data: { name, email, role, status },
        });
        (0, response_1.sendSuccess)(res, { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status });
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error updating user', 500);
    }
};
exports.updateUser = updateUser;
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        const user = await prisma_1.prisma.user.update({
            where: { id: id },
            data: { password: hashedPassword },
        });
        const bodyText = `Hi ${user.name},\n\nAn administrator has reset your KootaFlow account password. Your new password is: ${newPassword}\n\nPlease sign in and change your password immediately.`;
        const bodyHtml = (0, email_1.getBrandedTemplate)('Password Reset by Administrator', `<p>Hi ${user.name},</p>
       <p>An administrator has reset your KootaFlow account password.</p>
       <p><strong>New Password:</strong> ${newPassword}</p>
       <p>Please log in and change your password immediately from your account settings.</p>`);
        const emailResult = await (0, email_1.sendEmail)(user.email, 'KootaFlow Security Notification: Password Reset', bodyText, bodyHtml);
        (0, response_1.sendSuccess)(res, {
            message: 'Password reset successfully',
            emailSent: emailResult.success,
            warning: emailResult.success ? undefined : 'Security notification email failed to send.'
        });
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error resetting password', 500);
    }
};
exports.resetPassword = resetPassword;
