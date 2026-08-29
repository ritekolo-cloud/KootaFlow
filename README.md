# KootaFlow — Village Savings and Loan Association (VSLA) Management System

KootaFlow is a fullstack management platform designed specifically for Village Savings and Loan Associations (VSLA), Community Savings Groups, and Micro-finance Cooperatives.

---

## Key Features

- **Member Management:** Member onboarding, profiles, KYC data, status tracking, and group assignment.
- **Savings Ledger:** Voluntary savings, welfare contributions, and emergency fund balances.
- **Share Registry:** Share purchase tracking, limits enforcement, and share value monitoring.
- **Loan Portfolio:** Loan applications, multi-tier approvals, disbursement, dynamic interest calculations, and repayment schedules.
- **Repayment Tracking:** Loan repayments, receipts, and outstanding balance calculations.
- **Share-Out Calculations:** End-of-cycle distribution preview, loan deduction adjustments, and net payout calculation.
- **Financial Audit Trail:** Double-entry transaction ledger, financial statements, and export capabilities.
- **Role-Based Access Control:** Super Admin, Admin, Chairperson, Treasurer, Secretary, and Member permissions.
- **Real-Time Dashboard:** Cash in box, total savings, loan portfolio health, active members, and activity timeline.

---

## Project Structure

```
├── backend/            # Express REST API, Prisma ORM, JWT Auth, Socket.io
│   ├── prisma/         # Prisma schema and idempotent seed scripts
│   └── src/            # Backend modules (auth, groups, members, savings, shares, loans, etc.)
├── frontend/           # React 18, TypeScript, Tailwind CSS, Lucide Icons, React Query
│   └── src/            # Pages, components, hooks, stores, and API clients
├── render.yaml         # Render deployment blueprint
└── docker-compose.yml  # Local PostgreSQL container configuration
```

---

## Local Development Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and set your `DATABASE_URL`:
```bash
cp .env.example .env
```

### 2. Install Dependencies
```bash
npm ci
```

### 3. Initialize Database and Seed Data
```bash
npm run setup
```

### 4. Start Development Servers
```bash
npm run dev
```
- Frontend runs at: `http://localhost:5173`
- Backend API runs at: `http://localhost:5000`
- API Health Endpoint: `http://localhost:5000/api/health`
- Swagger Documentation: `http://localhost:5000/api/docs`

---

## Production Deployment

This repository includes a [`render.yaml`](render.yaml) blueprint for one-click deployment to Render.
The build process compiles the TypeScript backend and React frontend, applies database migrations, seeds the initial admin safely and idempotently, and serves the application.
