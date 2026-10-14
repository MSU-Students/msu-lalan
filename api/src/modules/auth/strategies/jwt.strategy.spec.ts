import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../dto/auth-response.dto';
import { User, UserRole } from '../../users/entities/user.entity';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configService = {
    get: jest.fn((_key: string, defaultValue: string) => defaultValue),
  };
  const authService = {
    validateJwtSession: jest.fn(),
    validateJwtUser: jest.fn(),
  };
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      authService as unknown as AuthService,
    );
  });

  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'student@msumain.edu.ph',
    role: UserRole.GENERAL_USER,
    isInstitutionalEmail: true,
    sid: 'session-1',
  };

  it('rejects a token whose session has been revoked', async () => {
    authService.validateJwtSession.mockResolvedValue(false);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.validateJwtUser).not.toHaveBeenCalled();
  });

  it('accepts an active session and attaches its ID to the authenticated user', async () => {
    const user = { id: 'user-1', isActive: true } as User;
    authService.validateJwtSession.mockResolvedValue(true);
    authService.validateJwtUser.mockResolvedValue(user);

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      id: 'user-1',
      sessionId: 'session-1',
    });
  });
});