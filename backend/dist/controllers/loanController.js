"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLoan = exports.createLoan = exports.getLoans = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getLoans = async (req, res) => {
    try {
        const user = req.user;
        const whereClause = user?.role === 'MEMBER' && user?.email
            ? { Member: { email: user.email } }
            : {};
        const loans = await prisma_1.prisma.loan.findMany({
            where: whereClause,
            include: {
                Member: true,
                Repayments: true,
            },
            orderBy: { loanDate: 'desc' }
        });
        // Calculate total repayment expected for each loan
        const loansWithTotals = loans.map(loan => {
            const totalRepayable = loan.amount + (loan.amount * (loan.interestRate / 100));
            const amountPaid = loan.Repayments.reduce((sum, r) => sum + r.amountPaid, 0);
            return {
                ...loan,
                totalRepayable,
                amountPaid,
                remainingBalance: totalRepayable - amountPaid
            };
        });
        (0, response_1.sendSuccess)(res, loansWithTotals);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error fetching loans', 500);
    }
};
exports.getLoans = getLoans;
const createLoan = async (req, res) => {
    try {
        const { memberId, amount, interestRate, dueDate } = req.body;
        const loan = await prisma_1.prisma.loan.create({
            data: {
                memberId,
                amount: parseFloat(amount),
                interestRate: parseFloat(interestRate),
                dueDate: new Date(dueDate),
                status: 'ACTIVE',
            },
        });
        (0, response_1.sendSuccess)(res, loan, 201);
    }
    catch (error) {
        console.error(error);
        (0, response_1.sendError)(res, 'Error creating loan', 500);
    }
};
exports.createLoan = createLoan;
const updateLoan = async (req, res) => {
    try {
        const { status } = req.body;
        const loan = await prisma_1.prisma.loan.update({
            where: { id: req.params.id },
            data: { status },
        });
        (0, response_1.sendSuccess)(res, loan);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error updating loan', 500);
    }
};
exports.updateLoan = updateLoan;
