/**
 * KootaFlow — Authentication, 3-Role Permissions & Member Privacy Test Suite
 *
 * Validates the strict 3-role system: ADMIN, TREASURER, MEMBER.
 * All tests use supertest with mocked Prisma client.
 */

// ─── Prisma mock (must come before any server import) ─────────────────────
jest.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
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
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(8),
    },
    savingsAccount: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
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
import { app, isAllowedOrigin } from '../src/server';
import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/config/jwt';
import { UserRole } from '@prisma/client';

// ─── 3 Mock user objects (ADMIN, TREASURER, MEMBER) ───────────────────────
const adminUser = {
  id: 1,
  email: 'admin@kootaflow.com',
  role: UserRole.ADMIN,
  isActive: true,
  firstName: 'Admin',
  lastName: 'User',
  passwordHash: '$2b$12$hash',
  memberProfile: null,
};

const treasurerUser = {
  id: 2,
  email: 'treasurer@kootaflow.test',
  role: UserRole.TREASURER,
  isActive: true,
  firstName: 'Kofi',
  lastName: 'Mensah',
  memberProfile: null,
};

const member1User = {
  id: 3,
  email: 'jabari.test@kootaflow.test',
  role: UserRole.MEMBER,
  isActive: true,
  firstName: 'Jabari',
  lastName: 'Test',
  memberProfile: { id: 10, memberNumber: 'MEM-004', groupId: 1, status: 'ACTIVE' },
};

const member2User = {
  id: 4,
  email: 'fatou.test@kootaflow.test',
  role: UserRole.MEMBER,
  isActive: true,
  firstName: 'Fatou',
  lastName: 'Test',
  memberProfile: { id: 11, memberNumber: 'MEM-005', groupId: 1, status: 'ACTIVE' },
};

// ─── JWT Access Tokens ────────────────────────────────────────────────────
const adminToken = signAccessToken({ userId: '1', email: 'admin@kootaflow.com', role: 'ADMIN' });
const treasurerToken = signAccessToken({ userId: '2', email: 'treasurer@kootaflow.test', role: 'TREASURER' });
const member1Token = signAccessToken({ userId: '3', email: 'jabari.test@kootaflow.test', role: 'MEMBER' });
const member2Token = signAccessToken({ userId: '4', email: 'fatou.test@kootaflow.test', role: 'MEMBER' });

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

describe('CORS origin policy', () => {
  it('allows valid production frontend origins', () => {
    expect(isAllowedOrigin('https://kootaflow-66mf.onrender.com')).toBe(true);
    expect(isAllowedOrigin('https://kootaflow-client-nz3v.onrender.com')).toBe(true);
  });

  it('blocks untrusted third-party origins', () => {
    expect(isAllowedOrigin('https://unauthorized-domain.com')).toBe(false);
    expect(isAllowedOrigin('https://evil-site.onrender.com')).toBe(false);
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
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce(adminUser)
      .mockResolvedValueOnce(adminUser);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@kootaflow.com');
    expect(res.body.data.role).toBe('ADMIN');
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
      revokedAt: new Date(),
      user: adminUser,
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

// ─── 3. 3-Role Permissions Matrix ───────────────────────────────────────────
describe('3-Role Permissions Matrix Enforcement (ADMIN, TREASURER, MEMBER)', () => {
  it('allows ADMIN to access user management (/api/users)', async () => {
    mockUserLookup(adminUser);
    (prisma.user.findMany as jest.Mock || jest.fn()).mockResolvedValueOnce([]);
    (prisma.user.count as jest.Mock).mockResolvedValueOnce(1);
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('denies TREASURER access to /api/users (ADMIN-only) with 403', async () => {
    mockUserLookup(treasurerUser);
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${treasurerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER access to /api/users (ADMIN-only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER access to /api/savings/summary (treasurer/admin only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/savings/summary')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER access to /api/shares/summary (treasurer/admin only) with 403', async () => {
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

  it('allows TREASURER to access /api/savings/summary', async () => {
    mockUserLookup(treasurerUser);
    (prisma.savingsAccount.findMany as jest.Mock).mockResolvedValueOnce([]);
    (prisma.savingsAccount.count as jest.Mock || jest.fn()).mockResolvedValueOnce(0);
    const res = await request(app)
      .get('/api/savings/summary')
      .set('Authorization', `Bearer ${treasurerToken}`);
    expect(res.status).toBe(200);
  });

  it('denies TREASURER from approving loans (ADMIN-only) with 403', async () => {
    mockUserLookup(treasurerUser);
    const res = await request(app)
      .patch('/api/loans/1/approve')
      .set('Authorization', `Bearer ${treasurerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies TREASURER from executing share-out (ADMIN-only) with 403', async () => {
    mockUserLookup(treasurerUser);
    const res = await request(app)
      .post('/api/shareout')
      .set('Authorization', `Bearer ${treasurerToken}`)
      .send({ cycleId: 1 });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('denies MEMBER from executing share-out (ADMIN-only) with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .post('/api/shareout')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({ cycleId: 1 });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ─── 4. Member Confidentiality & Privacy Scoping ────────────────────────────
describe('Member Confidentiality & Strict Privacy Scoping', () => {
  it('blocks member1 from viewing member2 savings account with 403', async () => {
    mockUserLookup(member1User);
    const res = await request(app)
      .get('/api/savings/member/11')
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
    (prisma.transaction.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (prisma.transaction.count as jest.Mock).mockResolvedValueOnce(0);
    const res = await request(app)
      .get('/api/transactions?memberId=11')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
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
      .get('/api/savings/member/10')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('allows TREASURER to view member savings account', async () => {
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
