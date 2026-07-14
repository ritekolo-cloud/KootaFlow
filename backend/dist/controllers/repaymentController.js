"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRepayment = exports.getRepayments = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getRepayments = async (req, res) => {
    try {
        const user = req.user;
        const whereClause = user?.role === 'MEMBER' && user?.email
            ? { Loan: { Member: { email: user.email } } }
            : {};
        const repayments = await prisma_1.prisma.repayment.findMany({
            where: whereClause,
            include: {
                Loan: {
                    include: { Member: true }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });
        (0, response_1.sendSuccess)(res, repayments);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error fetching repayments', 500);
    }
};
exports.getRepayments = getRepayments;
const createRepayment = async (req, res) => {
    try {
        const { loanId, amountPaid } = req.body;
        // Find loan
        const loan = await prisma_1.prisma.loan.findUnique({
            where: { id: loanId },
            include: { Repayments: true }
        });
        if (!loan)
            return (0, response_1.sendError)(res, 'Loan not found', 404);
        const paymentAmount = parseFloat(amountPaid);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            return (0, response_1.sendError)(res, 'Payment amount must be greater than 0', 400);
        }
        // Calculate current remaining balance before this payment
        const totalExpected = loan.amount + (loan.amount * (loan.interestRate / 100));
        const totalPaidSoFar = loan.Repayments.reduce((sum, r) => sum + r.amountPaid, 0);
        const remainingBefore = totalExpected - totalPaidSoFar;
        if (paymentAmount > remainingBefore) {
            return (0, response_1.sendError)(res, 'Payment amount cannot exceed remaining balance', 400);
        }
        const remainingBalance = remainingBefore - paymentAmount;
        const repayment = await prisma_1.prisma.repayment.create({
            data: {
                loanId,
                amountPaid: paymentAmount,
                remainingBalance: remainingBalance,
            },
        });
        // Update loan status if fully paid
        if (remainingBalance <= 0) {
            await prisma_1.prisma.loan.update({
                where: { id: loanId },
                data: { status: 'COMPLETED' }
            });
        }
        (0, response_1.sendSuccess)(res, repayment, 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error recording repayment', 500);
    }
};
exports.createRepayment = createRepayment;
