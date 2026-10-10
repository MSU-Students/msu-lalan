import { defineStore } from 'pinia';
import { UserRole, type AuthUser } from '../types';

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshTimer: ReturnType<typeof setTimeout> | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    refreshTimer: null,
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

    async logout(apiBaseUrl?: string) {
      if (apiBaseUrl && this.token) {
        try {
          await fetch(`${apiBaseUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { Authorization: `Bearer ${this.token}` },
          });
        } catch {
          // Clear local credentials even when the API is unreachable.
        }
      }

      this.clearAuthState();
    },

    async refreshSession(apiBaseUrl: string): Promise<boolean> {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) {
          this.clearAuthState();
          return false;
        }

        const json = await response.json();
        this.setAuth(json.accessToken, json.user);
        this.scheduleRefresh(apiBaseUrl);
        return true;
      } catch {
        return false;
      }
    },

    async initFromStorage(apiBaseUrl?: string) {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const storedToken = localStorage.getItem('msu_lalan_token');
      if (!storedToken) return;

      this.token = storedToken;
      this.isAuthenticated = true;

      if (!apiBaseUrl) return;
      if (this.isTokenNearExpiry(storedToken)) {
        await this.refreshSession(apiBaseUrl);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (response.ok) {
          const json = await response.json();
          this.setUser(json.data);
          this.scheduleRefresh(apiBaseUrl);
        } else if (response.status === 401) {
          await this.refreshSession(apiBaseUrl);
        }
      } catch {
        // Retain the cached session when the API is temporarily unreachable.
      }
    },

    clearAuthState() {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('msu_lalan_token');
      }
    },

    isTokenNearExpiry(token: string): boolean {
      const expiresAt = this.getTokenExpiry(token);
      return expiresAt !== null && expiresAt <= Date.now() + 60000;
    },

    scheduleRefresh(apiBaseUrl: string) {
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      const expiresAt = this.token ? this.getTokenExpiry(this.token) : null;
      if (expiresAt === null) return;

      const delay = Math.max(expiresAt - Date.now() - 60000, 0);
      this.refreshTimer = setTimeout(() => {
        void this.refreshSession(apiBaseUrl);
      }, delay);
    },

    getTokenExpiry(token: string): number | null {
      try {
        const encodedPayload = token.split('.')[1];
        if (!encodedPayload) return null;
        const payload = JSON.parse(
          atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')),
        );
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
      } catch {
        return null;
      }
    },
  },
});
