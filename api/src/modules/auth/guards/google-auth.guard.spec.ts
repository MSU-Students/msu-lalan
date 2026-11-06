import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './google-auth.guard';

describe('GoogleAuthGuard', () => {
  const configService = new ConfigService();
  jest.spyOn(configService, 'get').mockReturnValue(undefined);
  const guard = new GoogleAuthGuard(configService);
  const context = {} as ExecutionContext;

  it('allows the controller to handle OAuth when credentials are not configured', () => {
    expect(guard.canActivate(context)).toBe(true);
  });

  it('passes OAuth failures to the callback controller for a frontend redirect', () => {
    expect(guard.handleRequest(new Error('access_denied'), false, null, context)).toBeNull();
  });

  it('returns the authenticated user on success', () => {
    const user = { id: 'user-1' };

    expect(guard.handleRequest(null, user, null, context)).toBe(user);
  });
});
