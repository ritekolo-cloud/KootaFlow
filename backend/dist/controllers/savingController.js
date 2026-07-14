"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSaving = exports.getSavings = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getSavings = async (req, res) => {
    try {
        const user = req.user;
        const whereClause = user?.role === 'MEMBER' && user?.email
            ? { Member: { email: user.email } }
            : {};
        const savings = await prisma_1.prisma.saving.findMany({
            where: whereClause,
            include: {
                Member: true,
            },
            orderBy: { savingDate: 'desc' }
        });
        (0, response_1.sendSuccess)(res, savings);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error fetching savings', 500);
    }
};
exports.getSavings = getSavings;
const createSaving = async (req, res) => {
    try {
        const { memberId, amount, savingDate } = req.body;
        const saving = await prisma_1.prisma.saving.create({
            data: {
                memberId,
                amount: parseFloat(amount),
                savingDate: savingDate ? new Date(savingDate) : new Date(),
                recordedBy: req.user?.userId || 'system',
            },
        });
        (0, response_1.sendSuccess)(res, saving, 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error recording saving', 500);
    }
};
exports.createSaving = createSaving;
