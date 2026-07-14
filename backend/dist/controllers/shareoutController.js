"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateShareOut = exports.getShareOuts = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getShareOuts = async (req, res) => {
    try {
        const user = req.user;
        const whereClause = user?.role === 'MEMBER' && user?.email
            ? { Member: { email: user.email } }
            : {};
        const shareOuts = await prisma_1.prisma.shareOut.findMany({
            where: whereClause,
            include: {
                Member: {
                    include: {
                        Group: true
                    }
                },
            }
        });
        (0, response_1.sendSuccess)(res, shareOuts);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error fetching share-outs', 500);
    }
};
exports.getShareOuts = getShareOuts;
const calculateShareOut = async (req, res) => {
    try {
        const { groupId, totalAvailableShareOut } = req.body;
        const group = await prisma_1.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                Members: {
                    include: { Savings: true }
                }
            }
        });
        if (!group)
            return (0, response_1.sendError)(res, 'Group not found', 404);
        // Calculate group total savings
        let groupTotalSavings = 0;
        const memberSavings = {};
        group.Members.forEach(member => {
            const memberTotal = member.Savings.reduce((sum, s) => sum + s.amount, 0);
            memberSavings[member.id] = memberTotal;
            groupTotalSavings += memberTotal;
        });
        if (groupTotalSavings === 0) {
            return (0, response_1.sendError)(res, 'Group has no savings to share out', 400);
        }
        const availableAmount = parseFloat(totalAvailableShareOut);
        const results = [];
        for (const member of group.Members) {
            const memberTotal = memberSavings[member.id];
            if (memberTotal > 0) {
                const shareAmount = (memberTotal / groupTotalSavings) * availableAmount;
                // Save share-out record
                const shareOutRecord = await prisma_1.prisma.shareOut.create({
                    data: {
                        memberId: member.id,
                        cycleId: group.id, // using group ID as proxy for cycle for now
                        totalSavings: memberTotal,
                        shareAmount,
                    }
                });
                results.push(shareOutRecord);
            }
        }
        (0, response_1.sendSuccess)(res, results, 201);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error calculating share-outs', 500);
    }
};
exports.calculateShareOut = calculateShareOut;
