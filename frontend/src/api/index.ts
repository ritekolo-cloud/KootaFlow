import apiClient from './client';
import {
  ApiResponse,
  AuthResponse,
  User,
  VslaGroup,
  Cycle,
  Member,
  Share,
  SavingsAccount,
  Loan,
  LoanRepayment,
  Transaction,
  ShareOut,
  ShareOutPreview,
  Notification,
  DashboardStats,
  TransactionType,
  LoanStatus,
  MemberStatus,
} from '../types';

// ─── Auth API ─────────────────────────────────────────────────
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return res.data;
  },
  getMe: async () => {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },
  logout: async (refreshToken?: string) => {
    const res = await apiClient.post<ApiResponse<null>>('/auth/logout', { refreshToken });
    return res.data;
  },
  changePassword: async (passwords: { currentPassword: string; newPassword: string }) => {
    const res = await apiClient.patch<ApiResponse<null>>('/auth/me/password', passwords);
    return res.data;
  },
};

// ─── Groups & Cycles API ──────────────────────────────────────
export const groupsApi = {
  list: async (params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<ApiResponse<VslaGroup[]>>('/groups', { params });
    return res.data;
  },
  get: async (id: number) => {
    const res = await apiClient.get<ApiResponse<VslaGroup>>(`/groups/${id}`);
    return res.data;
  },
  create: async (data: Partial<VslaGroup>) => {
    const res = await apiClient.post<ApiResponse<VslaGroup>>('/groups', data);
    return res.data;
  },
  update: async (id: number, data: Partial<VslaGroup>) => {
    const res = await apiClient.patch<ApiResponse<VslaGroup>>(`/groups/${id}`, data);
    return res.data;
  },
  listCycles: async (groupId: number) => {
    const res = await apiClient.get<ApiResponse<Cycle[]>>(`/groups/${groupId}/cycles`);
    return res.data;
  },
  createCycle: async (groupId: number, data: { cycleNumber: number; startDate: string; endDate?: string; status?: string }) => {
    const res = await apiClient.post<ApiResponse<Cycle>>(`/groups/${groupId}/cycles`, data);
    return res.data;
  },
  updateCycle: async (groupId: number, cycleId: number, data: Partial<Cycle>) => {
    const res = await apiClient.patch<ApiResponse<Cycle>>(`/groups/${groupId}/cycles/${cycleId}`, data);
    return res.data;
  },
};

// ─── Members API ──────────────────────────────────────────────
export const membersApi = {
  list: async (params?: { groupId?: number; status?: MemberStatus; search?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<ApiResponse<Member[]>>('/members', { params });
    return res.data;
  },
  get: async (id: number) => {
    const res = await apiClient.get<ApiResponse<Member>>(`/members/${id}`);
    return res.data;
  },
  create: async (data: {
    groupId: number;
    memberNumber: string;
    firstName: string;
    lastName: string;
    phone?: string;
    nationalId?: string;
    joinedAt?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<Member>>('/members', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Member>) => {
    const res = await apiClient.patch<ApiResponse<Member>>(`/members/${id}`, data);
    return res.data;
  },
  getLedger: async (id: number, params?: { page?: number; limit?: number }) => {
    const res = await apiClient.get<ApiResponse<Transaction[]>>(`/members/${id}/ledger`, { params });
    return res.data;
  },
};

// ─── Savings API ──────────────────────────────────────────────
export const savingsApi = {
  getSummary: async (groupId?: number) => {
    const res = await apiClient.get<ApiResponse<{ totalSavings: number; accountCount: number }>>('/savings/summary', {
      params: { groupId },
    });
    return res.data;
  },
  getByMember: async (memberId: number) => {
    const res = await apiClient.get<ApiResponse<SavingsAccount[]>>(`/savings/member/${memberId}`);
    return res.data;
  },
  deposit: async (data: {
    memberId: number;
    amount: number;
    accountType?: string;
    description?: string;
    transactionDate?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<{ account: SavingsAccount; transaction: Transaction }>>('/savings/deposit', data);
    return res.data;
  },
  withdraw: async (data: {
    memberId: number;
    amount: number;
    accountType?: string;
    description?: string;
    transactionDate?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<{ account: SavingsAccount; transaction: Transaction }>>('/savings/withdraw', data);
    return res.data;
  },
};

// ─── Shares API ───────────────────────────────────────────────
export const sharesApi = {
  getSummary: async (params?: { groupId?: number; cycleId?: number }) => {
    const res = await apiClient.get<ApiResponse<{ totalShares: number; totalValue: number; memberCount: number; shareRecords: number }>>('/shares/summary', { params });
    return res.data;
  },
  getByMember: async (memberId: number, cycleId?: number) => {
    const res = await apiClient.get<ApiResponse<{ shares: Share[]; summary: { totalShares: number; totalValue: number } }>>(`/shares/member/${memberId}`, {
      params: { cycleId },
    });
    return res.data;
  },
  purchase: async (data: {
    memberId: number;
    cycleId: number;
    quantity: number;
    purchaseDate?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<{ share: Share; totalAmount: number }>>('/shares', data);
    return res.data;
  },
};

// ─── Loans API ────────────────────────────────────────────────
export const loansApi = {
  list: async (params?: { status?: LoanStatus; memberId?: number; groupId?: number; page?: number; limit?: number }) => {
    const res = await apiClient.get<ApiResponse<Loan[]>>('/loans', { params });
    return res.data;
  },
  get: async (id: number) => {
    const res = await apiClient.get<ApiResponse<Loan>>(`/loans/${id}`);
    return res.data;
  },
  apply: async (data: {
    memberId: number;
    cycleId: number;
    principalAmount: number;
    durationMonths: number;
    purpose?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<Loan>>('/loans', data);
    return res.data;
  },
  approve: async (id: number) => {
    const res = await apiClient.patch<ApiResponse<Loan>>(`/loans/${id}/approve`);
    return res.data;
  },
  reject: async (id: number, reason?: string) => {
    const res = await apiClient.patch<ApiResponse<Loan>>(`/loans/${id}/reject`, { reason });
    return res.data;
  },
  repay: async (
    id: number,
    data: {
      amountPaid: number;
      paymentDate?: string;
      receiptNumber?: string;
      notes?: string;
    }
  ) => {
    const res = await apiClient.post<ApiResponse<{ repayment: LoanRepayment; newBalance: number; isFullyPaid: boolean }>>(`/loans/${id}/repay`, data);
    return res.data;
  },
  getRepayments: async (id: number) => {
    const res = await apiClient.get<ApiResponse<LoanRepayment[]>>(`/loans/${id}/repayments`);
    return res.data;
  },
};

// ─── Transactions Ledger API ──────────────────────────────────
export const transactionsApi = {
  list: async (params?: {
    groupId?: number;
    memberId?: number;
    type?: TransactionType;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await apiClient.get<ApiResponse<{ transactions: Transaction[]; totals: Record<string, number> }>>('/transactions', { params });
    return res.data;
  },
  get: async (id: number) => {
    const res = await apiClient.get<ApiResponse<Transaction>>(`/transactions/${id}`);
    return res.data;
  },
};

// ─── Share-Out API ────────────────────────────────────────────
export const shareOutApi = {
  list: async (groupId?: number) => {
    const res = await apiClient.get<ApiResponse<ShareOut[]>>('/shareout', { params: { groupId } });
    return res.data;
  },
  calculate: async (cycleId: number) => {
    const res = await apiClient.get<ApiResponse<ShareOutPreview>>('/shareout/calculate', { params: { cycleId } });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await apiClient.get<ApiResponse<ShareOut>>(`/shareout/${id}`);
    return res.data;
  },
  execute: async (data: { cycleId: number; notes?: string; distributionDate?: string }) => {
    const res = await apiClient.post<ApiResponse<{ shareOut: ShareOut; distributions: any[] }>>('/shareout', data);
    return res.data;
  },
};

// ─── Dashboard API ────────────────────────────────────────────
export const dashboardApi = {
  get: async (groupId?: number) => {
    const res = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard', { params: { groupId } });
    return res.data;
  },
};

// ─── Notifications API ────────────────────────────────────────
export const notificationsApi = {
  list: async (params?: { unread?: boolean; page?: number; limit?: number }) => {
    const res = await apiClient.get<ApiResponse<{ notifications: Notification[]; unreadCount: number }>>('/notifications', { params });
    return res.data;
  },
  markRead: async (id: number) => {
    const res = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await apiClient.patch<ApiResponse<{ markedRead: number }>>('/notifications/read-all');
    return res.data;
  },
};

// ─── Users API ────────────────────────────────────────────────
export const usersApi = {
  list: async (params?: { search?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<ApiResponse<User[]>>('/users', { params });
    return res.data;
  },
  get: async (id: number) => {
    const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await apiClient.post<ApiResponse<User>>('/users', data);
    return res.data;
  },
  update: async (id: number, data: Partial<User>) => {
    const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, data);
    return res.data;
  },
  deactivate: async (id: number) => {
    const res = await apiClient.delete<ApiResponse<{ id: number }>>(`/users/${id}`);
    return res.data;
  },
};
