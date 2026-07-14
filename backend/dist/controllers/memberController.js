"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMember = exports.updateMember = exports.createMember = exports.getMemberById = exports.getMembers = void 0;
const prisma_1 = require("../config/prisma");
const response_1 = require("../utils/response");
const getMembers = async (req, res) => {
    try {
        const members = await prisma_1.prisma.member.findMany({
            include: {
                Group: true,
                Savings: true,
            },
        });
        const membersWithSavings = members.map(m => {
            const totalSavings = m.Savings.reduce((sum, s) => sum + s.amount, 0);
            return {
                ...m,
                totalSavings
            };
        });
        (0, response_1.sendSuccess)(res, membersWithSavings);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error fetching members', 500);
    }
};
exports.getMembers = getMembers;
const getMemberById = async (req, res) => {
    try {
        const member = await prisma_1.prisma.member.findUnique({
            where: { id: req.params.id },
            include: { Group: true, Savings: true, Loans: true },
        });
        if (!member)
            return (0, response_1.sendError)(res, 'Member not found', 404);
        (0, response_1.sendSuccess)(res, member);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error fetching member', 500);
    }
};
exports.getMemberById = getMemberById;
const createMember = async (req, res) => {
    try {
        const { groupId, fullName, phoneNumber, email, gender, address, membershipStatus } = req.body;
        let actualGroupId = groupId;
        if (!actualGroupId) {
            let group = await prisma_1.prisma.group.findFirst();
            if (!group) {
                group = await prisma_1.prisma.group.create({
                    data: {
                        groupName: 'Main VSLA Group',
                        location: 'Main Location',
                        cycleStartDate: new Date(),
                        cycleEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                    }
                });
            }
            actualGroupId = group.id;
        }
        const member = await prisma_1.prisma.member.create({
            data: {
                groupId: actualGroupId,
                fullName,
                phoneNumber,
                email,
                gender,
                address,
                membershipStatus: membershipStatus || 'ACTIVE',
            },
        });
        (0, response_1.sendSuccess)(res, member, 201);
    }
    catch (error) {
        console.error(error);
        (0, response_1.sendError)(res, 'Error creating member', 500);
    }
};
exports.createMember = createMember;
const updateMember = async (req, res) => {
    try {
        const { fullName, phoneNumber, email, gender, address, membershipStatus } = req.body;
        const member = await prisma_1.prisma.member.update({
            where: { id: req.params.id },
            data: { fullName, phoneNumber, email, gender, address, membershipStatus },
        });
        (0, response_1.sendSuccess)(res, member);
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error updating member', 500);
    }
};
exports.updateMember = updateMember;
const deleteMember = async (req, res) => {
    try {
        await prisma_1.prisma.member.delete({
            where: { id: req.params.id },
        });
        (0, response_1.sendSuccess)(res, { message: 'Member deleted successfully' });
    }
    catch (error) {
        (0, response_1.sendError)(res, 'Error deleting member', 500);
    }
};
exports.deleteMember = deleteMember;
