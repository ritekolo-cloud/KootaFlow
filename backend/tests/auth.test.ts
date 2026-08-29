/**
 * KootaFlow Phase 5 — Authentication, Roles & Privacy Test Suite
 *
 * These are pure HTTP-level tests using supertest. Prisma is mocked so
 * the suite runs without a live database connection.
 */

// ─── Prisma mock (must come before any server import) ─────────────────────
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(5),
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    member: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(8),
    },
    savingsAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    share: {
      findMany: jest.fn(),
    },
    loan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    vslaGroup: {
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    cycle: {
      findUnique: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/config/jwt';
import { UserRole } from '@prisma/client';

// ─── Mock user objects ──────────────────────────────────────────────────────
const superAdminUser = {
  id: 1,
  email: 'admin@kootaflow.com',
  role: UserRole.SUPER_ADMIN,
  isActive: true,
  firstName: 'Admin',
  lastName: 'User',
  passwordHash: '$2b$12$hash',
  memberProfile: null,
};

const chairpersonUser = {
  id: 2,
  email: 'chairperson@kootaflow.test',
  role: UserRole.CHAIRPERSON,
  isActive: true,
  firstName: 'Chair',
  lastName: 'Person',
  memberProfile: null,
};

const treasurerUser = {
  id: 3,
  email: 'treasurer@kootaflow.test',
  role: UserRole.TREASURER,
  isActive: true,
  firstName: 'Treas',
  lastName: 'Urer',
  memberProfile: null,
};

const member1User = {
  id: 4,
  email: 'jabari.test@kootaflow.test',
  role: UserRole.MEMBER,
  isActive: true,
  firstName: 'Jabari',
  lastName: 'Test',
  memberProfile: { id: 10, memberNumber: 'MEM-004', groupId: 1, status: 'ACTIVE' },
};

const member2User = {
  id: 5,
  email: 'fatou.test@kootaflow.test',
  role: UserRole.MEMBER,
  isActive: true,
  firstName: 'Fatou',
  lastName: 'Test',
  memberProfile: { id: 11, memberNumber: 'MEM-005', groupId: 1, status: 'ACTIVE' },
};

// ─── JWT Tokens ────────────────────────────────────────────────────────────
const adminToken = signAccessToken({ userId: '1', email: 'admin@kootaflow.com', role: 'SUPER_ADMIN' });
const chairpersonToken = signAccessToken({ userId: '2', email: 'chairperson@kootaflow.test', role: 'CHAIRPERSON' });
const treasurerToken = signAccessToken({ userId: '3', email: 'treasurer@kootaflow.test', role: 'TREASURER' });
const member1Token = signAccessToken({ userId: '4', email: 'jabari.test@kootaflow.test', role: 'MEMBER' });
const member2Token = signAccessToken({ userId: '5', email: 'fatou.test@kootaflow.test', role: 'MEMBER' });

// ─── Helper: configure prisma mock for a given user ────────────────────────
function mockUserLookup(user: Record<string, unknown> | null) {
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
}

afterAll(async () => {
  (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
});

// ─── 1. Health Check ───────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with KootaFlow status and zero Morija references', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.text.toLowerCase()).not.toContain('morija');
    expect(res.text.toLowerCase()).not.toContain('cantiques');
    expect(res.text.toLowerCase()).not.toContain('hymn');
  });
});

// ─── 2. Auth Lifecycle ─────────────────────────────────────────────────────
describe('Authentication Lifecycle', () => {
  it('rejects unauthenticated request to /api/auth/me with 401', async () => {
    mockUserLookup(null);
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 for authenticated request to /api/auth/me with valid Bearer token', async () => {
    // authenticate() calls findUnique once, me() calls it a second time
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce(superAdminUser)  // for authenticate middleware
      .mockResolvedValueOnce(superAdminUser); // for me() handler
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@kootaflow.com');
  });

  it('rejects request with malformed token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt.token.here');
    expect(res.status).toBe(401);
  });

  it('rejects /api/auth/refresh with missing token with 400', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects /api/auth/refresh with invalid/unknown token with 401', async () => {
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'deadbeefdeadbeef0000000000000000deadbeefdeadbeef0000000000000000deadbeef00' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects /api/auth/refresh with revoked token with 401', async () => {
    (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: 99,
      userId: 1,
      tokenHash: 'some-hash',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: new Date(), // already revoked
      user: superAdminUser,
    });
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'deadbeefdeadbeef0000000000000000deadbeefdeadbeef0000000000000000deadbeef00' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects /api/auth/logout without auth with 401', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(401);
  });
});

// ─── 3. Role-Based Permissions ─────────────────────────────────────────────
describe('Role-Based Permissions Enforcement', () => {
  it('denies MEMBER access to /api/users (admin-only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER access to /api/savings/summary (officer-only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/savings/summary')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER access to /api/shares/summary (officer-only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/shares/summary')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER from recording a savings deposit (treasurer-only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .post('/api/savings/deposit')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({ memberId: 10, amount: 5000 });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER from approving loans (chairperson-only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .patch('/api/loans/1/approve')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies TREASURER from approving loans (chairperson/admin only) with 403', async () => {
    mockUserLookup(treasurerUser);
    const res = await request(app)
      .patch('/api/loans/1/approve')
      .set('Authorization', `Bearer ${treasurerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER from executing share-out (admin-only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .post('/api/shareout')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({ cycleId: 1 });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies SECRETARY from recording savings deposit (treasurer-only) with 403', async () => {
    const secretaryUser = { ...chairpersonUser, id: 6, role: UserRole.SECRETARY };
    const secretaryToken = signAccessToken({ userId: '6', email: 'sec@kootaflow.test', role: 'SECRETARY' });
    mockUserLookup(secretaryUser);
    const res = await request(app)
      .post('/api/savings/deposit')
      .set('Authorization', `Bearer ${secretaryToken}`)
      .send({ memberId: 10, amount: 5000 });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ─── 4. Member Confidentiality / Privacy Guards ────────────────────────────
describe('Member Confidentiality & Privacy Scoping', () => {
  it('blocks member1 from viewing member2 savings account with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/savings/member/11') // member2's memberId=11
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  it('blocks member1 from viewing member2 shareholdings with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/shares/member/11')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  it('blocks member1 from viewing member2 profile with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/members/11')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  it('blocks member1 from viewing member2 ledger with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/members/11/ledger')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  it('scopes member1 transactions to only their own memberId (privacy scoping)', async () => {
    mockUserLookup(member1User);
    // mock both calls in listTransactions (findMany + count for totals + main findMany)
    (prisma.transaction.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // main paginated list
      .mockResolvedValueOnce([]); // totals aggregation
    (prisma.transaction.count as jest.Mock).mockResolvedValueOnce(0);
    // Even though member1 requests memberId=11 (member2), backend will override to memberId=10
    const res = await request(app)
      .get('/api/transactions?memberId=11')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Verify the call was made with member1's memberId (10) not member2's (11)
    const callArgs = (prisma.transaction.findMany as jest.Mock).mock.calls[0][0];
    expect(callArgs.where.memberId).toBe(10);
  });

  it('allows member1 to view own savings account', async () => {
    mockUserLookup(member1User);
    (prisma.savingsAccount.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 1, memberId: 10, accountType: 'VOLUNTARY', balance: 50000, transactions: [] },
    ]);
    (prisma.member.findUnique as jest.Mock).mockResolvedValueOnce({ id: 10, firstName: 'Jabari' });
    const res = await request(app)
      .get('/api/savings/member/10') // own memberId=10
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('allows OFFICER (treasurer) to view any member savings account', async () => {
    mockUserLookup(treasurerUser);
    (prisma.savingsAccount.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 1, memberId: 11, accountType: 'VOLUNTARY', balance: 75000, transactions: [] },
    ]);
    (prisma.member.findUnique as jest.Mock).mockResolvedValueOnce({ id: 11, firstName: 'Fatou' });
    const res = await request(app)
      .get('/api/savings/member/11')
      .set('Authorization', `Bearer ${treasurerToken}`);
    expect(res.status).toBe(200);
  });
});
