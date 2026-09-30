import { defineStore } from 'pinia';
import { UserRole, type AuthUser } from '../types';

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),

  getters: {
    isSuperAdmin: (state): boolean => state.user?.role === UserRole.SUPER_ADMIN,
    isCampusAdmin: (state): boolean =>
      state.user?.role === UserRole.CAMPUS_ADMIN || state.user?.role === UserRole.SUPER_ADMIN,
    hasInstitutionalEmail: (state): boolean => !!state.user?.isInstitutionalEmail,
    displayName: (state): string => {
      if (!state.user) return 'Guest';
      if (state.user.firstName || state.user.lastName) {
        return `${state.user.firstName || ''} ${state.user.lastName || ''}`.trim();
      }
      return state.user.email;
    },
  },

  actions: {
    setToken(token: string) {
      this.token = token;
      this.isAuthenticated = true;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('msu_lalan_token', token);
      }
    },

    setUser(user: AuthUser) {
      this.user = user;
    },

    setAuth(token: string, user: AuthUser) {
      this.setToken(token);
      this.setUser(user);
    },

    logout() {
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('msu_lalan_token');
      }
    },

    initFromStorage() {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedToken = localStorage.getItem('msu_lalan_token');
        if (storedToken) {
          this.token = storedToken;
          this.isAuthenticated = true;
        }
      }
    },
  },
});
