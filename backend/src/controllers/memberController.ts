import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const getMembers = async (req: Request, res: Response) => {
  try {
    const members = await prisma.member.findMany({
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
    
    sendSuccess(res, membersWithSavings);
  } catch (error) {
    sendError(res, 'Error fetching members', 500);
  }
};

export const getMemberById = async (req: Request, res: Response) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id as string },
      include: { Group: true, Savings: true, Loans: true },
    });
    if (!member) return sendError(res, 'Member not found', 404);
    sendSuccess(res, member);
  } catch (error) {
    sendError(res, 'Error fetching member', 500);
  }
};

export const createMember = async (req: Request, res: Response) => {
  try {
    const { groupId, fullName, phoneNumber, email, gender, address, membershipStatus } = req.body;
    
    let actualGroupId = groupId;
    if (!actualGroupId) {
      let group = await prisma.group.findFirst();
      if (!group) {
        group = await prisma.group.create({
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

    const member = await prisma.member.create({
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
    sendSuccess(res, member, 201);
  } catch (error) {
    console.error(error);
    sendError(res, 'Error creating member', 500);
  }
};

export const updateMember = async (req: Request, res: Response) => {
  try {
    const { fullName, phoneNumber, email, gender, address, membershipStatus } = req.body;
    const member = await prisma.member.update({
      where: { id: req.params.id as string },
      data: { fullName, phoneNumber, email, gender, address, membershipStatus },
    });
    sendSuccess(res, member);
  } catch (error) {
    sendError(res, 'Error updating member', 500);
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  try {
    await prisma.member.delete({
      where: { id: req.params.id as string },
    });
    sendSuccess(res, { message: 'Member deleted successfully' });
  } catch (error) {
    sendError(res, 'Error deleting member', 500);
  }
};
