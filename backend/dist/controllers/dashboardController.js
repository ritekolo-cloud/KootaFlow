"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getDashboardStats = async (req, res) => {
    try {
        const user = req.user;
        const isMember = user?.role === 'MEMBER';
        const email = user?.email;
        const memberWhere = isMember && email ? { Member: { email } } : {};
        const loanWhere = isMember && email ? { status: 'ACTIVE', Member: { email } } : { status: 'ACTIVE' };
        const totalMembers = await prisma_1.prisma.member.count();
        const savings = await prisma_1.prisma.saving.aggregate({
            _sum: { amount: true },
            where: memberWhere
        });
        const totalSavings = savings._sum.amount || 0;
        const activeLoansCount = await prisma_1.prisma.loan.count({
            where: loanWhere
        });
        const activeLoans = await prisma_1.prisma.loan.findMany({
            where: loanWhere,
            include: { Repayments: true }
        });
        let pendingRepaymentsAmount = 0;
        activeLoans.forEach(loan => {
            const totalExpected = loan.amount + (loan.amount * (loan.interestRate / 100));
            const totalPaid = loan.Repayments.reduce((sum, r) => sum + r.amountPaid, 0);
            pendingRepaymentsAmount += (totalExpected - totalPaid);
        });
        // Recent activities
        const recentSavings = await prisma_1.prisma.saving.findMany({
            take: 5,
            where: memberWhere,
            orderBy: { savingDate: 'desc' },
            include: { Member: true }
        });
        (0, response_1.sendSuccess)(res, {
            totalMembers,
            totalSavings,
            activeLoansCount,
            pendingRepaymentsAmount,
            recentActivities: recentSavings.map(s => ({
                id: s.id,
                type: 'SAVING',
                description: `${s.Member.fullName} saved ${s.amount}`,
                date: s.savingDate
            }))
        });
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error fetching dashboard stats', 500);
    }
};
exports.getDashboardStats = getDashboardStats;
