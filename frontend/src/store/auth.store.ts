import { create } from 'zustand';
import { User, UserRole } from '../types';
import { authApi } from '../api';
import { BASE_URL } from '../api/client';

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

function getResponseMessage(err: any): string | null {
  return (
    err.response?.data?.message ||
    (err.response?.data?.errors
      ? Object.values(err.response.data.errors).flat().join(', ')
      : null)
  );
}

async function diagnoseNetworkFailure(): Promise<string> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Your device appears to be offline. Check your internet connection and try again.';
  }

  if (typeof fetch === 'undefined') {
    return 'The API could not be reached. The backend may be unavailable or still waking up.';
  }

  try {
    await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
    });

    return 'The API host is reachable, but the browser blocked the login response. This usually indicates a CORS or preflight configuration problem.';
  } catch {
    return 'The backend is unavailable or still waking up. Please wait 15-30 seconds and try again.';
  }
}

async function getLoginErrorMessage(err: any): Promise<string> {
  const responseMessage = getResponseMessage(err);
  const status = err.response?.status;

  if (status === 401) {
    return responseMessage || 'Invalid email or password.';
  }

  if (status === 403) {
    return responseMessage || 'You do not have permission to sign in.';
  }

  if (status === 404) {
    return responseMessage || 'The login endpoint was not found. Please contact support.';
  }

  if (status === 408 || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return 'The login request timed out. Please try again.';
  }

  if (status === 429) {
    return responseMessage || 'Too many login attempts. Please wait a moment and try again.';
  }

  if (status >= 500) {
    return responseMessage || 'The API returned a server error. Please try again shortly.';
  }

  if (!err.response && err.message?.includes('Network Error')) {
    return diagnoseNetworkFailure();
  }

  return responseMessage || 'Login failed. Please check your credentials.';
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
      const msg = await getLoginErrorMessage(err);

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
