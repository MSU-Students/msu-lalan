import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/entities/user.entity';
import { AuthController } from '../auth.controller';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no roles are required on route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockExecutionContext({ role: UserRole.GENERAL_USER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.SUPER_ADMIN, UserRole.CAMPUS_ADMIN]);

    const context = createMockExecutionContext({
      id: 'uuid-1',
      role: UserRole.CAMPUS_ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks the required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.SUPER_ADMIN]);

    const context = createMockExecutionContext({
      id: 'uuid-2',
      role: UserRole.GENERAL_USER,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if no user is authenticated', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.SUPER_ADMIN]);

    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  describe('GUEST role boundaries', () => {
    const contextForRoute = (handler: unknown, user: any): ExecutionContext =>
      ({
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => handler,
        getClass: () => AuthController,
      }) as unknown as ExecutionContext;

    it('denies guests on a route restricted to administrators', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SUPER_ADMIN, UserRole.CAMPUS_ADMIN]);
      const context = createMockExecutionContext({ id: 'guest-1', role: UserRole.GUEST });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('denies guests on a route restricted to regular users', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.GENERAL_USER]);
      const context = createMockExecutionContext({ id: 'guest-1', role: UserRole.GUEST });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('denies guests on the real admin verification endpoint (uses its actual @Roles metadata)', () => {
      const realGuard = new RolesGuard(new Reflector());
      const adminRoute = AuthController.prototype.verifyAdminAccess;

      expect(() => realGuard.canActivate(contextForRoute(adminRoute, { role: UserRole.GUEST }))).toThrow(
        ForbiddenException,
      );
      expect(() =>
        realGuard.canActivate(contextForRoute(adminRoute, { role: UserRole.GENERAL_USER })),
      ).toThrow(ForbiddenException);
      expect(realGuard.canActivate(contextForRoute(adminRoute, { role: UserRole.CAMPUS_ADMIN }))).toBe(true);
      expect(realGuard.canActivate(contextForRoute(adminRoute, { role: UserRole.SUPER_ADMIN }))).toBe(true);
    });

    it('still allows guests on routes that declare no roles (profile, logout)', () => {
      const realGuard = new RolesGuard(new Reflector());
      const guest = { id: 'guest-1', role: UserRole.GUEST };

      expect(realGuard.canActivate(contextForRoute(AuthController.prototype.getProfile, guest))).toBe(true);
      expect(realGuard.canActivate(contextForRoute(AuthController.prototype.logout, guest))).toBe(true);
    });
  });
});
