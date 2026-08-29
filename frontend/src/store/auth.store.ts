import { create } from 'zustand';
import { User, UserRole } from '../types';
import { authApi } from '../api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  clearError: () => void;

  // Role Helpers
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isChairperson: () => boolean;
  isTreasurer: () => boolean;
  isSecretary: () => boolean;
  isMember: () => boolean;
  isOfficer: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const saved = localStorage.getItem('kootaflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('kootaflow_token'),
  isAuthenticated: !!localStorage.getItem('kootaflow_token'),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(credentials);
      const { accessToken, user } = res.data;

      localStorage.setItem('kootaflow_token', accessToken);
      localStorage.setItem('kootaflow_user', JSON.stringify(user));

      set({
        token: accessToken,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(', ')
          : 'Login failed. Please check your credentials.');
      set({ isLoading: false, error: msg, isAuthenticated: false, user: null, token: null });
      throw new Error(msg);
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('kootaflow_token');
      localStorage.removeItem('kootaflow_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('kootaflow_token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const res = await authApi.getMe();
      localStorage.setItem('kootaflow_user', JSON.stringify(res.data));
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('kootaflow_token');
      localStorage.removeItem('kootaflow_user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (data) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...data };
    localStorage.setItem('kootaflow_user', JSON.stringify(updated));
    set({ user: updated });
  },

  clearError: () => set({ error: null }),

  isSuperAdmin: () => get().user?.role === 'SUPER_ADMIN',
  isAdmin: () => get().user?.role === 'ADMIN' || get().user?.role === 'SUPER_ADMIN',
  isChairperson: () => get().user?.role === 'CHAIRPERSON',
  isTreasurer: () => get().user?.role === 'TREASURER',
  isSecretary: () => get().user?.role === 'SECRETARY',
  isMember: () => get().user?.role === 'MEMBER',
  isOfficer: () => {
    const role = get().user?.role;
    return !!role && ['SUPER_ADMIN', 'ADMIN', 'CHAIRPERSON', 'TREASURER', 'SECRETARY'].includes(role);
  },
}));
