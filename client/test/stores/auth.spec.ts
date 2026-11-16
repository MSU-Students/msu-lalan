import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { UserRole } from '../../types';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should initialize with default guest state', () => {
    const authStore = useAuthStore();
    expect(authStore.token).toBeNull();
    expect(authStore.refreshToken).toBeNull();
    expect(authStore.user).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.displayName).toBe('Guest');
  });

  it('signs in with username and password and stores both returned tokens without sending cookies', async () => {
    const authStore = useAuthStore();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'signed-in-token',
        refreshToken: 'refresh-secret-token',
        user: {
          id: 'usr-101',
          email: 'student@msumain.edu.ph',
          role: UserRole.GENERAL_USER,
          isInstitutionalEmail: true,
        },
      }),
    }) as jest.Mock;

    try {
      await authStore.login(
        'student@msumain.edu.ph',
        'valid-password',
        'http://localhost:3001/api/v1',
      );

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'student@msumain.edu.ph',
            password: 'valid-password',
          }),
        }),
      );
      
      // Ensure 'credentials: include' was removed
      const callArgs = (globalThis.fetch as jest.Mock).mock.calls[0][1];
      expect(callArgs.credentials).toBeUndefined();

      expect(authStore.token).toBe('signed-in-token');
      expect(authStore.refreshToken).toBe('refresh-secret-token');
      expect(localStorage.getItem('msu_lalan_token')).toBe('signed-in-token');
      expect(localStorage.getItem('msu_lalan_refresh_token')).toBe('refresh-secret-token');
      expect(authStore.user?.email).toBe('student@msumain.edu.ph');
      expect(authStore.isAuthenticated).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('shows a safe error when credentials are rejected', async () => {
    const authStore = useAuthStore();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as jest.Mock;

    try {
      await expect(
        authStore.login('student@msumain.edu.ph', 'wrong-password', 'http://localhost:3001/api/v1'),
      ).rejects.toThrow('The email or password you entered is incorrect.');
      expect(authStore.isAuthenticated).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should set auth tokens and recognize institutional email status', () => {
    const authStore = useAuthStore();
    authStore.setAuth('jwt-sample-token-xyz', 'refresh-sample', {
      id: 'usr-101',
      email: 'student@msumain.edu.ph',
      firstName: 'Fatima',
      lastName: 'Alawi',
      role: UserRole.GENERAL_USER,
      isInstitutionalEmail: true,
    });

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.token).toBe('jwt-sample-token-xyz');
    expect(authStore.refreshToken).toBe('refresh-sample');
    expect(authStore.hasInstitutionalEmail).toBe(true);
    expect(authStore.displayName).toBe('Fatima Alawi');
    expect(authStore.isCampusAdmin).toBe(false);
  });

  it('should correctly evaluate RBAC permissions for Campus and Super Admins', () => {
    const authStore = useAuthStore();

    authStore.setUser({
      id: 'adm-202',
      email: 'encoder@msumain.edu.ph',
      role: UserRole.CAMPUS_ADMIN,
      isInstitutionalEmail: true,
    });
    expect(authStore.isCampusAdmin).toBe(true);
    expect(authStore.isSuperAdmin).toBe(false);

    authStore.setUser({
      id: 'adm-303',
      email: 'superadmin@msumain.edu.ph',
      role: UserRole.SUPER_ADMIN,
      isInstitutionalEmail: true,
    });
    expect(authStore.isCampusAdmin).toBe(true);
    expect(authStore.isSuperAdmin).toBe(true);
  });

  it('should clear user state and both stored tokens on logout', async () => {
    const authStore = useAuthStore();
    authStore.setTokens('test-token', 'test-refresh');
    expect(authStore.isAuthenticated).toBe(true);

    await authStore.logout();
    expect(authStore.token).toBeNull();
    expect(authStore.refreshToken).toBeNull();
    expect(authStore.user).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(localStorage.getItem('msu_lalan_token')).toBeNull();
    expect(localStorage.getItem('msu_lalan_refresh_token')).toBeNull();
  });

  it('calls the API to invalidate the current session with the access token before clearing local auth', async () => {
    const authStore = useAuthStore();
    authStore.setTokens('active-access-token', 'refresh-token');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;

    await authStore.logout('http://localhost:3001/api/v1');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer active-access-token' },
      }),
    );
    
    const callArgs = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.credentials).toBeUndefined();

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.token).toBeNull();
    globalThis.fetch = originalFetch;
  });

  it('clears local state even when the logout API is unreachable', async () => {
    const authStore = useAuthStore();
    authStore.setTokens('active-access-token', 'refresh-token');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock;

    await authStore.logout('http://localhost:3001/api/v1');

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.token).toBeNull();
    globalThis.fetch = originalFetch;
  });

  it('uses the refresh token as a Bearer header and stores the rotated replacements', async () => {
    const authStore = useAuthStore();
    authStore.setTokens('old-access-token', 'current-refresh-token');
    
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'replacement-access-token',
        refreshToken: 'replacement-refresh-token',
        user: {
          id: 'usr-101',
          email: 'student@msumain.edu.ph',
          role: UserRole.GENERAL_USER,
          isInstitutionalEmail: true,
        },
      }),
    }) as jest.Mock;

    await expect(authStore.refreshSession('http://localhost:3001/api/v1')).resolves.toBe(true);

    expect(authStore.token).toBe('replacement-access-token');
    expect(authStore.refreshToken).toBe('replacement-refresh-token');
    expect(localStorage.getItem('msu_lalan_token')).toBe('replacement-access-token');
    expect(localStorage.getItem('msu_lalan_refresh_token')).toBe('replacement-refresh-token');
    
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/auth/refresh',
      expect.objectContaining({ 
        method: 'POST', 
        headers: { Authorization: 'Bearer current-refresh-token' } 
      }),
    );
    
    const callArgs = (globalThis.fetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.credentials).toBeUndefined();

    globalThis.fetch = originalFetch;
  });

  it('fails refresh safely without querying API if refresh token is missing locally', async () => {
    const authStore = useAuthStore();
    authStore.setTokens('old-access-token', '');
    authStore.refreshToken = null; 

    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn() as jest.Mock;

    await expect(authStore.refreshSession('http://localhost:3001/api/v1')).resolves.toBe(false);
    
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(authStore.isAuthenticated).toBe(false);
    
    globalThis.fetch = originalFetch;
  });

  it('should recognize guest accounts and keep them out of admin permissions', () => {
    const authStore = useAuthStore();
    authStore.setUser({
      id: 'usr-202',
      email: 'guest@example.com',
      role: UserRole.GUEST,
      isInstitutionalEmail: false,
    });

    expect(authStore.isGuest).toBe(true);
    expect(authStore.isCampusAdmin).toBe(false);
    expect(authStore.isSuperAdmin).toBe(false);
  });

  describe('register', () => {
    const api = 'http://localhost:3001/api/v1';
    const payload = {
      email: 'guest@example.com',
      password: 'Campus123',
      firstName: 'Fatima',
      lastName: 'Alawi',
    };
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('posts the registration JSON to /auth/register and reports success without signing in', async () => {
      const authStore = useAuthStore();
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ statusCode: 201, message: 'Registration successful. You can now sign in.' }),
      }) as jest.Mock;

      const result = await authStore.register(api, payload);

      expect(result).toEqual({
        success: true,
        message: 'Registration successful. You can now sign in.',
        status: 201,
      });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${api}/auth/register`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      );
      expect(authStore.isAuthenticated).toBe(false);
      expect(authStore.token).toBeNull();
      expect(localStorage.getItem('msu_lalan_token')).toBeNull();
    });

    it('reports a friendly duplicate-account message on 409', async () => {
      const authStore = useAuthStore();
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ statusCode: 409, message: 'An account with this email already exists' }),
      }) as jest.Mock;

      const result = await authStore.register(api, payload);

      expect(result.success).toBe(false);
      expect(result.status).toBe(409);
      expect(result.message).toContain('already exists');
    });

    it('joins backend validation messages on 400', async () => {
      const authStore = useAuthStore();
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ statusCode: 400, message: ['email must be an email', 'password is too short'] }),
      }) as jest.Mock;

      const result = await authStore.register(api, payload);

      expect(result.success).toBe(false);
      expect(result.message).toContain('email must be an email password is too short');
    });

    it('falls back to a generic message when the server error is not JSON', async () => {
      const authStore = useAuthStore();
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json');
        },
      }) as jest.Mock;

      const result = await authStore.register(api, payload);

      expect(result).toEqual({
        success: false,
        message: 'Registration failed. Please try again.',
        status: 500,
      });
    });

    it('handles an unreachable server', async () => {
      const authStore = useAuthStore();
      globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as jest.Mock;

      const result = await authStore.register(api, payload);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Could not reach the server');
    });
  });
});