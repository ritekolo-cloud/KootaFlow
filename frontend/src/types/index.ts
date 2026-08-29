// ─────────────────────────────────────────────────────────────
// KootaFlow VSLA Management System — TypeScript Type Definitions
// ─────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'TREASURER' | 'MEMBER';

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EXITED';

export type LoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'PAID'
  | 'DEFAULTED';

export type TransactionType =
  | 'SHARE_PURCHASE'
  | 'SAVINGS_DEPOSIT'
  | 'SAVINGS_WITHDRAWAL'
  | 'LOAN_DISBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'FINE'
  | 'SHARE_OUT'
  | 'WELFARE_CONTRIBUTION';

export type CycleStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export type MeetingFrequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';

// ─── Models ───────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
  memberProfile?: {
    id: number;
    memberNumber: string;
    groupId: number;
    status: MemberStatus;
  } | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface VslaGroup {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  meetingFrequency: MeetingFrequency;
  sharePrice: number | string;
  maxSharesPerMember: number;
  loanInterestRate: number | string;
  maxLoanDurationMonths: number;
  welfareContribution: number | string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    members: number;
    cycles: number;
  };
  cycles?: Cycle[];
}

export interface Cycle {
  id: number;
  groupId: number;
  cycleNumber: number;
  startDate: string;
  endDate?: string | null;
  status: CycleStatus;
  createdAt?: string;
  group?: VslaGroup;
}

export interface Member {
  id: number;
  userId?: number | null;
  groupId: number;
  memberNumber: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  nationalId?: string | null;
  status: MemberStatus;
  joinedAt: string;
  createdAt?: string;
  group?: VslaGroup;
  user?: Partial<User> | null;
  savingsAccounts?: SavingsAccount[];
  shares?: Share[];
  loans?: Loan[];
  _count?: {
    loans: number;
    shares: number;
  };
}

export interface Share {
  id: number;
  memberId: number;
  cycleId: number;
  quantity: number;
  pricePerShare: number | string;
  totalAmount: number | string;
  purchaseDate: string;
  member?: Member;
  cycle?: Cycle;
}

export interface SavingsAccount {
  id: number;
  memberId: number;
  accountType: string;
  balance: number | string;
  createdAt?: string;
  updatedAt?: string;
  member?: Member;
  transactions?: Transaction[];
}

export interface Loan {
  id: number;
  memberId: number;
  cycleId: number;
  principalAmount: number | string;
  interestRate: number | string;
  interestAmount: number | string;
  totalRepayable: number | string;
  balanceRemaining: number | string;
  durationMonths: number;
  purpose?: string | null;
  status: LoanStatus;
  approvedById?: number | null;
  approvedAt?: string | null;
  disbursedAt?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  member?: Member;
  cycle?: Cycle;
  approvedBy?: Partial<User> | null;
  repayments?: LoanRepayment[];
}

export interface LoanRepayment {
  id: number;
  loanId: number;
  amountPaid: number | string;
  principalPortion: number | string;
  interestPortion: number | string;
  remainingBalance: number | string;
  paymentDate: string;
  receiptNumber?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface Transaction {
  id: number;
  groupId: number;
  memberId?: number | null;
  savingsAccountId?: number | null;
  type: TransactionType;
  amount: number | string;
  balanceAfter?: number | string | null;
  reference?: string | null;
  description?: string | null;
  transactionDate: string;
  createdAt?: string;
  member?: Partial<Member> | null;
  group?: Partial<VslaGroup> | null;
  savingsAccount?: Partial<SavingsAccount> | null;
}

export interface ShareOut {
  id: number;
  cycleId: number;
  totalFunds: number | string;
  totalShares: number;
  valuePerShare: number | string;
  distributionDate: string;
  notes?: string | null;
  createdAt?: string;
  cycle?: Cycle;
  distributions?: ShareOutDistribution[];
}

export interface ShareOutDistribution {
  id: number;
  shareOutId: number;
  memberId: number;
  sharesOwned: number;
  grossAmount: number | string;
  loanDeductions: number | string;
  netPayout: number | string;
  member?: Member;
}

export interface ShareOutPreview {
  cycle: Cycle;
  totalFunds: number;
  totalShares: number;
  valuePerShare: number;
  memberBreakdown: {
    memberId: number;
    memberNumber: string;
    firstName: string;
    lastName: string;
    sharesOwned: number;
    grossAmount: number;
    loanDeductions: number;
    netPayout: number;
  }[];
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
  user?: Partial<User> | null;
}

// ─── API & Pagination ─────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[]>;
}

export interface DashboardStats {
  overview: {
    totalGroups: number;
    totalMembers: number;
    activeMembers: number;
    totalUsers: number;
    activeCycles: number;
  };
  loans: {
    pending: number;
    active: number;
    defaulted: number;
    totalDisbursed: number;
    totalOutstanding: number;
    totalRepaid: number;
  };
  financials: {
    totalShareValue: number;
    totalSavings: number;
    totalSharesPurchased?: number;
  };
  recentTransactions: Transaction[];
  pendingLoanDetails: Loan[];
  monthlyTrend: {
    type: TransactionType;
    _sum: { amount: number };
  }[];
}
