import { ExecutionContext } from '@nestjs/common';
import { GoogleAuthGuard } from './google-auth.guard';

describe('GoogleAuthGuard', () => {
  const guard = new GoogleAuthGuard();
  const context = {} as ExecutionContext;

  it('passes OAuth failures to the callback controller for a frontend redirect', () => {
    expect(guard.handleRequest(new Error('access_denied'), false, null, context)).toBeNull();
  });

  it('returns the authenticated user on success', () => {
    const user = { id: 'user-1' };

    expect(guard.handleRequest(null, user, null, context)).toBe(user);
  });
});
