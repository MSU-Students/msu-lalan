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
    expect(authStore.user).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.displayName).toBe('Guest');
  });

  it('should set auth tokens and recognize institutional email status', () => {
    const authStore = useAuthStore();
    authStore.setAuth('jwt-sample-token-xyz', {
      id: 'usr-101',
      email: 'student@msumain.edu.ph',
      firstName: 'Fatima',
      lastName: 'Alawi',
      role: UserRole.GENERAL_USER,
      isInstitutionalEmail: true,
    });

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.token).toBe('jwt-sample-token-xyz');
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

  it('should clear user state and storage on logout', () => {
    const authStore = useAuthStore();
    authStore.setToken('test-token');
    expect(authStore.isAuthenticated).toBe(true);

    authStore.logout();
    expect(authStore.token).toBeNull();
    expect(authStore.user).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(localStorage.getItem('msu_lalan_token')).toBeNull();
  });
});
