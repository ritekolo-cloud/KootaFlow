import request from 'supertest';
import { app } from '../src/server';
import { prisma } from '../src/config/database';

describe('KootaFlow — Live Database Smoke Tests & 3-Role Security Verification', () => {
  const defaultPassword = 'Admin@123456';

  let adminToken: string;
  let adminRefreshToken: string;
  let treasurerToken: string;
  let member1Token: string;
  let member2Token: string;

  let member1Id: number;
  let member2Id: number;
  let activeCycleId: number;
  let createdLoanId: number;

  beforeAll(async () => {
    // 1. Log in as Admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@kootaflow.com', password: defaultPassword });
    
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.data.accessToken;
    adminRefreshToken = adminLoginRes.body.data.refreshToken;

    // 2. Log in as Treasurer
    const treasLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'treasurer@kootaflow.test', password: defaultPassword });
    expect(treasLoginRes.status).toBe(200);
    treasurerToken = treasLoginRes.body.data.accessToken;

    // 3. Log in as Member 1 (Jabari)
    const m1LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jabari.test@kootaflow.test', password: defaultPassword });
    expect(m1LoginRes.status).toBe(200);
    member1Token = m1LoginRes.body.data.accessToken;
    member1Id = m1LoginRes.body.data.user.memberProfile.id;

    // 4. Log in as Member 2 (Fatou)
    const m2LoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fatou.test@kootaflow.test', password: defaultPassword });
    expect(m2LoginRes.status).toBe(200);
    member2Token = m2LoginRes.body.data.accessToken;
    member2Id = m2LoginRes.body.data.user.memberProfile.id;

    // Query active cycle
    const cycle = await prisma.cycle.findFirst({ where: { status: 'ACTIVE' } });
    if (cycle) activeCycleId = cycle.id;

    // Clean up any previous smoke test loan to ensure idempotent loan creation
    const oldTestLoan = await prisma.loan.findFirst({
      where: { purpose: 'Smoke test small business inventory' },
    });
    if (oldTestLoan) {
      await prisma.loanRepayment.deleteMany({ where: { loanId: oldTestLoan.id } });
      await prisma.loan.delete({ where: { id: oldTestLoan.id } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ─── 1. Health & Database Status ─────────────────────────
  describe('1. Health Check & Live Database Connection', () => {
    it('should return 200 with connected database and seeded stats', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.database).toBe('connected');
      expect(res.body.stats.users).toBeGreaterThanOrEqual(3);
      expect(res.body.stats.members).toBeGreaterThanOrEqual(8);
      expect(res.body.stats.groups).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 2. Authentication Flow ──────────────────────────────
  describe('2. Authentication Flow & Token Rotation', () => {
    it('should retrieve logged in user profile via /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@kootaflow.com');
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('should refresh access token and rotate refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: adminRefreshToken });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(adminRefreshToken); // Rotated!

      const newRefreshToken = res.body.data.refreshToken;
      const newAccessToken = res.body.data.accessToken;

      // Attempt to reuse old rotated refresh token -> must be rejected with 401
      const reuseRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: adminRefreshToken });
      expect(reuseRes.status).toBe(401);

      // Logout with new refresh token
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({ refreshToken: newRefreshToken });
      expect(logoutRes.status).toBe(200);

      // Attempt to refresh with logged-out token -> must be rejected with 401
      const afterLogoutRes = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken });
      expect(afterLogoutRes.status).toBe(401);
    });
  });

  // ─── 3. Role-Based Permissions & Guard Tests ─────────────
  describe('3. Role-Based Permissions Enforcement', () => {
    it('should allow Admin to list system users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should deny Member from accessing /api/users with 403', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should deny Member from accessing savings summary with 403', async () => {
      const res = await request(app)
        .get('/api/savings/summary')
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.status).toBe(403);
    });

    it('should allow Treasurer to record a savings deposit', async () => {
      const res = await request(app)
        .post('/api/savings/deposit')
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send({ memberId: member1Id, amount: 2000, description: 'Live smoke test deposit' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.transaction.amount)).toBe(2000);
    });

    it('should deny Member from recording savings deposit with 403', async () => {
      const res = await request(app)
        .post('/api/savings/deposit')
        .set('Authorization', `Bearer ${member1Token}`)
        .send({ memberId: member1Id, amount: 2000 });
      expect(res.status).toBe(403);
    });
  });

  // ─── 4. Confidentiality & Privacy Guards ─────────────────
  describe('4. Member Confidentiality & Privacy Scoping', () => {
    it('should allow member1 to view their own savings account', async () => {
      const res = await request(app)
        .get(`/api/savings/member/${member1Id}`)
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].memberId).toBe(member1Id);
    });

    it('should block member1 from viewing member2 savings account with 403 Access denied', async () => {
      const res = await request(app)
        .get(`/api/savings/member/${member2Id}`)
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should block member1 from viewing member2 shareholdings with 403 Access denied', async () => {
      const res = await request(app)
        .get(`/api/shares/member/${member2Id}`)
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should block member1 from viewing member2 profile details with 403 Access denied', async () => {
      const res = await request(app)
        .get(`/api/members/${member2Id}`)
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should block member1 from viewing member2 member ledger with 403 Access denied', async () => {
      const res = await request(app)
        .get(`/api/members/${member2Id}/ledger`)
        .set('Authorization', `Bearer ${member1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });
  });

  // ─── 5. Loans & Repayments Workflow ──────────────────────
  describe('5. VSLA Loan Lifecycle (Apply, Approve, Repay)', () => {
    it('should allow Member 2 to apply for a loan', async () => {
      const res = await request(app)
        .post('/api/loans')
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          memberId: member2Id,
          cycleId: activeCycleId,
          principalAmount: 15000,
          durationMonths: 2,
          purpose: 'Smoke test small business inventory',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
      expect(Number(res.body.data.principalAmount)).toBe(15000);
      createdLoanId = res.body.data.id;
    });

    it('should deny Member from approving a loan with 403', async () => {
      const res = await request(app)
        .patch(`/api/loans/${createdLoanId}/approve`)
        .set('Authorization', `Bearer ${member2Token}`);
      expect(res.status).toBe(403);
    });

    it('should deny Treasurer from approving a loan with 403 (Admin-only)', async () => {
      const res = await request(app)
        .patch(`/api/loans/${createdLoanId}/approve`)
        .set('Authorization', `Bearer ${treasurerToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow Admin to approve and disburse the loan', async () => {
      const res = await request(app)
        .patch(`/api/loans/${createdLoanId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.disbursedAt).toBeDefined();
    });

    it('should allow Treasurer to record a partial loan repayment', async () => {
      const res = await request(app)
        .post(`/api/loans/${createdLoanId}/repay`)
        .set('Authorization', `Bearer ${treasurerToken}`)
        .send({
          amountPaid: 5000,
          receiptNumber: 'REC-SMOKE-001',
          notes: 'Smoke test partial repayment',
        });
      expect(res.status).toBe(201);
      expect(Number(res.body.data.repayment.amountPaid)).toBe(5000);
      expect(res.body.data.isFullyPaid).toBe(false);
    });
  });

  // ─── 6. Share-Out Preview ────────────────────────────────
  describe('6. Share-Out Calculation Preview', () => {
    it('should allow Admin to preview share-out calculation without modifying state', async () => {
      const res = await request(app)
        .get(`/api/shareout/calculate?cycleId=${activeCycleId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalShares).toBeGreaterThanOrEqual(1);
      expect(res.body.data.memberBreakdown.length).toBeGreaterThanOrEqual(1);
    });
  });
});
