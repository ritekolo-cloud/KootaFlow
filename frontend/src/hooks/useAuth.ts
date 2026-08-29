import { useAuthStore } from '../store/auth.store';

export function useAuth() {
  return useAuthStore();
}

export default useAuth;
