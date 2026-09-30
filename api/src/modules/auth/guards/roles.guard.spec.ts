import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/entities/user.entity';

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
});
