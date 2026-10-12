import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request = require('supertest');
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

describe('AuthController', () => {
  let app: INestApplication;
  const authService = {
    loginWithPassword: jest.fn(),
    refreshTokens: jest.fn(),
    getRefreshTtlSeconds: jest.fn().mockReturnValue(2592000),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    authService.loginWithPassword.mockReset();
    authService.refreshTokens.mockReset();
    authService.logout.mockReset();

    const testingModule = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key, defaultValue) => defaultValue) },
        },
        { provide: GoogleAuthGuard, useValue: {} },
        { provide: RolesGuard, useValue: {} },
      ],
    });
    testingModule.overrideGuard(JwtAuthGuard).useValue({
      canActivate: (context) => {
        context.switchToHttp().getRequest().user = { id: 'user-1', sessionId: 'session-1' };
        return true;
      },
    });
    const module = await testingModule.compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the auth response for valid credentials', async () => {
    const authResponse = {
      accessToken: 'signed-token',
      refreshToken: 'secret-refresh-token',
      user: {
        id: 'user-1',
        email: 'student@msumain.edu.ph',
        firstName: 'Student',
        lastName: 'User',
        avatarUrl: '',
        role: 'GENERAL_USER',
        isInstitutionalEmail: true,
        departmentAffiliation: null,
      },
    };
    authService.loginWithPassword.mockResolvedValue(authResponse);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'student@msumain.edu.ph', password: 'valid-password' })
      .expect(200)
      .expect({
        accessToken: authResponse.accessToken,
        user: authResponse.user,
      });

    expect(authService.loginWithPassword).toHaveBeenCalledWith(
      'student@msumain.edu.ph',
      'valid-password',
    );
  });

  it('rotates the refresh cookie without returning the refresh token in JSON', async () => {
    authService.refreshTokens.mockResolvedValue({
      accessToken: 'replacement-token',
      refreshToken: 'replacement-refresh-secret',
      user: { id: 'user-1', email: 'student@msumain.edu.ph' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'msu_lalan_refresh=current-refresh-secret')
      .expect(200)
      .expect(({ body, headers }) => {
        expect(body).toEqual({
          accessToken: 'replacement-token',
          user: { id: 'user-1', email: 'student@msumain.edu.ph' },
        });
        expect(headers['set-cookie'][0]).toContain('msu_lalan_refresh=replacement-refresh-secret');
        expect(headers['set-cookie'][0]).toContain('HttpOnly');
      });

    expect(authService.refreshTokens).toHaveBeenCalledWith('current-refresh-secret');
  });

  it('rejects refresh requests when the refresh token is invalid', async () => {
    authService.refreshTokens.mockRejectedValue(
      new UnauthorizedException('Invalid or expired refresh token'),
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .expect(401);
  });

  it('revokes the authenticated session and clears the refresh cookie on logout', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(200)
      .expect(({ body, headers }) => {
        expect(body.message).toBe('Logged out successfully');
        expect(headers['set-cookie'][0]).toContain('msu_lalan_refresh=');
        expect(headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
      });

    expect(authService.logout).toHaveBeenCalledWith('session-1', 'user-1');
  });

  it('rejects invalid request bodies', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'not-an-email', password: '' })
      .expect(400);

    expect(authService.loginWithPassword).not.toHaveBeenCalled();
  });

  it('returns unauthorized for invalid credentials', async () => {
    authService.loginWithPassword.mockRejectedValue(
      new UnauthorizedException('Invalid username or password'),
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'student@msumain.edu.ph', password: 'wrong-password' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Invalid username or password');
      });
  });
});