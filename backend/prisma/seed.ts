import { PrismaClient, UserRole, MemberStatus, LoanStatus, TransactionType, CycleStatus, MeetingFrequency } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Starting KootaFlow VSLA idempotent database seed...');

  const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const hashedPassword = await hashPassword(defaultPassword);

  // 1. Create or Update Administrator
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kootaflow.com';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: 'KootaFlow',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName: 'KootaFlow',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Administrator ready: ${adminUser.email} (Role: ${adminUser.role})`);

  // 2. Create Treasurer Account (Fictional demo data)
  const treasurer = await prisma.user.upsert({
    where: { email: 'treasurer@kootaflow.test' },
    update: {
      firstName: 'Kofi',
      lastName: 'Mensah',
      phone: '+250780000002',
      role: UserRole.TREASURER,
      isActive: true,
    },
    create: {
      email: 'treasurer@kootaflow.test',
      passwordHash: hashedPassword,
      firstName: 'Kofi',
      lastName: 'Mensah',
      phone: '+250780000002',
      role: UserRole.TREASURER,
      isActive: true,
    },
  });
  console.log(`✅ Treasurer account ready: ${treasurer.email} (Role: ${treasurer.role})`);

  // Clean up any legacy non-standard test accounts
  await prisma.user.deleteMany({
    where: {
      email: { in: ['chairperson@kootaflow.test', 'secretary@kootaflow.test'] },
    },
  });

  // 3. Create or Update Demo VSLA Group
  const group = await prisma.vslaGroup.upsert({
    where: { code: 'KF-ALPHA-01' },
    update: {
      name: 'KootaFlow Alpha Savings Group',
      description: 'Demonstration Village Savings and Loan Association Group',
      meetingFrequency: MeetingFrequency.WEEKLY,
      sharePrice: 2000,
      maxSharesPerMember: 5,
      loanInterestRate: 10,
      maxLoanDurationMonths: 3,
      welfareContribution: 500,
    },
    create: {
      name: 'KootaFlow Alpha Savings Group',
      code: 'KF-ALPHA-01',
      description: 'Demonstration Village Savings and Loan Association Group',
      meetingFrequency: MeetingFrequency.WEEKLY,
      sharePrice: 2000,
      maxSharesPerMember: 5,
      loanInterestRate: 10,
      maxLoanDurationMonths: 3,
      welfareContribution: 500,
    },
  });
  console.log(`✅ Demo VSLA Group ready: ${group.name} (${group.code})`);

  // 4. Create or Update Active Operational Cycle (Cycle 1)
  const cycle = await prisma.cycle.upsert({
    where: {
      groupId_cycleNumber: {
        groupId: group.id,
        cycleNumber: 1,
      },
    },
    update: {
      status: CycleStatus.ACTIVE,
      startDate: new Date('2026-01-01'),
    },
    create: {
      groupId: group.id,
      cycleNumber: 1,
      startDate: new Date('2026-01-01'),
      status: CycleStatus.ACTIVE,
    },
  });
  console.log(`✅ Active Cycle ready: Cycle #${cycle.cycleNumber}`);

  // 5. Seed Fictional VSLA Members
  const mockMembers = [
    { number: 'MEM-001', firstName: 'Amara', lastName: 'Diallo', phone: '+250780000001', email: 'amara.test@kootaflow.test', shares: 5, savings: 25000 },
    { number: 'MEM-002', firstName: 'Kofi', lastName: 'Mensah', phone: '+250780000002', email: 'treasurer@kootaflow.test', shares: 4, savings: 20000 },
    { number: 'MEM-003', firstName: 'Zainab', lastName: 'Kamara', phone: '+250780000003', email: 'zainab.test@kootaflow.test', shares: 5, savings: 30000 },
    { number: 'MEM-004', firstName: 'Jabari', lastName: 'Okafor', phone: '+250780000004', email: 'jabari.test@kootaflow.test', shares: 3, savings: 15000 },
    { number: 'MEM-005', firstName: 'Fatou', lastName: 'Bah', phone: '+250780000005', email: 'fatou.test@kootaflow.test', shares: 4, savings: 22000 },
    { number: 'MEM-006', firstName: 'Tariq', lastName: 'Ndege', phone: '+250780000006', email: 'tariq.test@kootaflow.test', shares: 2, savings: 10000 },
    { number: 'MEM-007', firstName: 'Amina', lastName: 'Sowe', phone: '+250780000007', email: 'amina.test@kootaflow.test', shares: 5, savings: 28000 },
    { number: 'MEM-008', firstName: 'Chidi', lastName: 'Eze', phone: '+250780000008', email: 'chidi.test@kootaflow.test', shares: 3, savings: 18000 },
  ];

  for (const m of mockMembers) {
    // Create member user if not exists
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        isActive: true,
      },
      create: {
        email: m.email,
        passwordHash: hashedPassword,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        role: UserRole.MEMBER,
        isActive: true,
      },
    });

    // Create member record
    const member = await prisma.member.upsert({
      where: {
        groupId_memberNumber: {
          groupId: group.id,
          memberNumber: m.number,
        },
      },
      update: {
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        userId: user.id,
        status: MemberStatus.ACTIVE,
      },
      create: {
        groupId: group.id,
        memberNumber: m.number,
        userId: user.id,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        nationalId: `ID-${m.number}`,
        status: MemberStatus.ACTIVE,
        joinedAt: new Date('2026-01-01'),
      },
    });

    // Create savings account
    await prisma.savingsAccount.upsert({
      where: {
        memberId_accountType: {
          memberId: member.id,
          accountType: 'VOLUNTARY',
        },
      },
      update: {
        balance: m.savings,
      },
      create: {
        memberId: member.id,
        accountType: 'VOLUNTARY',
        balance: m.savings,
      },
    });

    // Check if member already has shares for this cycle
    const existingShares = await prisma.share.findFirst({
      where: {
        memberId: member.id,
        cycleId: cycle.id,
      },
    });

    if (!existingShares) {
      const shareCost = Number(group.sharePrice) * m.shares;
      await prisma.share.create({
        data: {
          memberId: member.id,
          cycleId: cycle.id,
          quantity: m.shares,
          pricePerShare: group.sharePrice,
          totalAmount: shareCost,
          purchaseDate: new Date('2026-01-15'),
        },
      });

      // Record transaction
      await prisma.transaction.create({
        data: {
          groupId: group.id,
          memberId: member.id,
          type: TransactionType.SHARE_PURCHASE,
          amount: shareCost,
          description: `Share purchase (${m.shares} shares @ ${group.sharePrice})`,
          transactionDate: new Date('2026-01-15'),
        },
      });

      // Record savings transaction
      await prisma.transaction.create({
        data: {
          groupId: group.id,
          memberId: member.id,
          type: TransactionType.SAVINGS_DEPOSIT,
          amount: m.savings,
          balanceAfter: m.savings,
          description: 'Initial voluntary savings deposit',
          transactionDate: new Date('2026-01-15'),
        },
      });
    }
  }
  console.log(`✅ ${mockMembers.length} Fictional Members, Shares & Savings seeded`);

  // 6. Seed Sample Loans and Repayments
  const member4 = await prisma.member.findFirst({ where: { memberNumber: 'MEM-004', groupId: group.id } });
  const member5 = await prisma.member.findFirst({ where: { memberNumber: 'MEM-005', groupId: group.id } });
  const member6 = await prisma.member.findFirst({ where: { memberNumber: 'MEM-006', groupId: group.id } });

  if (member4) {
    const existingLoan = await prisma.loan.findFirst({ where: { memberId: member4.id, cycleId: cycle.id } });
    if (!existingLoan) {
      const principal = 40000;
      const interestRate = 10;
      const interestAmount = (principal * interestRate) / 100;
      const totalRepayable = principal + interestAmount;
      const repaymentAmount = 22000;
      const balanceRemaining = totalRepayable - repaymentAmount;

      const loan = await prisma.loan.create({
        data: {
          memberId: member4.id,
          cycleId: cycle.id,
          principalAmount: principal,
          interestRate: interestRate,
          interestAmount: interestAmount,
          totalRepayable: totalRepayable,
          balanceRemaining: balanceRemaining,
          durationMonths: 2,
          purpose: 'Small agriculture business inputs',
          status: LoanStatus.ACTIVE,
          approvedById: adminUser.id,
          approvedAt: new Date('2026-02-01'),
          disbursedAt: new Date('2026-02-02'),
          dueDate: new Date('2026-04-02'),
        },
      });

      await prisma.transaction.create({
        data: {
          groupId: group.id,
          memberId: member4.id,
          type: TransactionType.LOAN_DISBURSEMENT,
          amount: principal,
          description: `Loan disbursement for ${member4.firstName} ${member4.lastName}`,
          transactionDate: new Date('2026-02-02'),
        },
      });

      await prisma.loanRepayment.create({
        data: {
          loanId: loan.id,
          amountPaid: repaymentAmount,
          principalPortion: 20000,
          interestPortion: 2000,
          remainingBalance: balanceRemaining,
          paymentDate: new Date('2026-02-28'),
          receiptNumber: 'REC-2026-001',
          notes: 'Month 1 installment',
        },
      });

      await prisma.transaction.create({
        data: {
          groupId: group.id,
          memberId: member4.id,
          type: TransactionType.LOAN_REPAYMENT,
          amount: repaymentAmount,
          description: `Loan repayment received from ${member4.firstName} ${member4.lastName}`,
          transactionDate: new Date('2026-02-28'),
        },
      });
    }
  }

  if (member5) {
    const existingLoan5 = await prisma.loan.findFirst({ where: { memberId: member5.id, cycleId: cycle.id } });
    if (!existingLoan5) {
      const principal = 30000;
      const interestRate = 10;
      const interestAmount = 3000;
      const totalRepayable = principal + interestAmount;

      const loan5 = await prisma.loan.create({
        data: {
          memberId: member5.id,
          cycleId: cycle.id,
          principalAmount: principal,
          interestRate: interestRate,
          interestAmount: interestAmount,
          totalRepayable: totalRepayable,
          balanceRemaining: 0,
          durationMonths: 1,
          purpose: 'Retail inventory restocking',
          status: LoanStatus.PAID,
          approvedById: adminUser.id,
          approvedAt: new Date('2026-01-10'),
          disbursedAt: new Date('2026-01-11'),
          dueDate: new Date('2026-02-11'),
        },
      });

      await prisma.loanRepayment.create({
        data: {
          loanId: loan5.id,
          amountPaid: totalRepayable,
          principalPortion: principal,
          interestPortion: interestAmount,
          remainingBalance: 0,
          paymentDate: new Date('2026-02-08'),
          receiptNumber: 'REC-2026-002',
          notes: 'Full early loan payoff',
        },
      });
    }
  }

  if (member6) {
    const existingLoan6 = await prisma.loan.findFirst({ where: { memberId: member6.id, cycleId: cycle.id } });
    if (!existingLoan6) {
      await prisma.loan.create({
        data: {
          memberId: member6.id,
          cycleId: cycle.id,
          principalAmount: 20000,
          interestRate: 10,
          interestAmount: 2000,
          totalRepayable: 22000,
          balanceRemaining: 22000,
          durationMonths: 1,
          purpose: 'Tailoring equipment repair',
          status: LoanStatus.PENDING,
        },
      });
    }
  }
  console.log('✅ Sample VSLA Loans & Repayments seeded');

  // 7. Seed Sample Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: adminUser.id,
        title: 'New Loan Application',
        message: 'Tariq Ndege applied for a loan of 20,000 RWF for tailoring equipment.',
        type: 'LOAN_APPLICATION',
      },
      {
        userId: adminUser.id,
        title: 'Weekly VSLA Meeting Reminder',
        message: 'Upcoming weekly meeting scheduled for Friday at 15:00.',
        type: 'MEETING',
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Sample Notifications seeded');

  console.log('✨ KootaFlow VSLA Database seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
