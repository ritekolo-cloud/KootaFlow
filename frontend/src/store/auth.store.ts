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
  isAdmin: () => boolean;
  isTreasurer: () => boolean;
  isMember: () => boolean;
  isStaff: () => boolean;
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
      const { accessToken, refreshToken, user } = res.data;

      localStorage.setItem('kootaflow_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('kootaflow_refresh_token', refreshToken);
      }
      localStorage.setItem('kootaflow_user', JSON.stringify(user));

      set({
        token: accessToken,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const isTimeout =
        err.code === 'ECONNABORTED' ||
        err.message?.includes('timeout') ||
        (!err.response && err.message?.includes('Network Error'));

      const msg = isTimeout
        ? 'The server is currently waking up from sleep. Please wait 15–30 seconds and try again.'
        : err.response?.data?.message ||
          (err.response?.data?.errors
            ? Object.values(err.response.data.errors).flat().join(', ')
            : 'Login failed. Please check your credentials.');

      set({ isLoading: false, error: msg, isAuthenticated: false, user: null, token: null });
      throw new Error(msg);
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('kootaflow_refresh_token');
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      } else {
        await authApi.logout();
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('kootaflow_token');
      localStorage.removeItem('kootaflow_refresh_token');
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
      localStorage.removeItem('kootaflow_refresh_token');
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

  isAdmin: () => get().user?.role === 'ADMIN',
  isTreasurer: () => get().user?.role === 'TREASURER',
  isMember: () => get().user?.role === 'MEMBER',
  isStaff: () => {
    const role = get().user?.role;
    return role === 'ADMIN' || role === 'TREASURER';
  },
}));
