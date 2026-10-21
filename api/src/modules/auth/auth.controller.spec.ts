import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
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
    registerGuest: jest.fn(),
    loginWithPassword: jest.fn(),
    generateTokens: jest.fn(),
    refreshTokens: jest.fn(),
    getRefreshTtlSeconds: jest.fn().mockReturnValue(2592000),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    authService.registerGuest.mockReset();
    authService.loginWithPassword.mockReset();
    authService.generateTokens.mockReset();

    
    authService.refreshTokens.mockReset();
    authService.logout.mockReset();

    const testingModule = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback: string) =>
              key === 'FRONTEND_URL' ? 'http://localhost:3000' : fallback,
            ),
          },
        },
        { provide: GoogleAuthGuard, useValue: {} },
        { provide: RolesGuard, useValue: {} },
      ],
    });
    testingModule.overrideGuard(GoogleAuthGuard).useValue({ canActivate: () => true });
    
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

  describe('POST /auth/register', () => {
    const validBody = {
      email: 'guest@example.com',
      password: 'Campus123',
      firstName: 'Fatima',
      lastName: 'Alawi',
    };
    const createdUser = {
      id: 'new-user-1',
      email: 'guest@example.com',
      firstName: 'Fatima',
      lastName: 'Alawi',
      avatarUrl: '',
      role: 'GUEST',
      isInstitutionalEmail: false,
    };

    it('creates a guest account and returns 201 without secrets', async () => {
      authService.registerGuest.mockResolvedValue(createdUser);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validBody)
        .expect(201)
        .expect(({ body }) => {
          expect(body).toEqual({
            statusCode: 201,
            message: 'Registration successful. You can now sign in.',
            data: createdUser,
          });
          expect(JSON.stringify(body)).not.toContain('Campus123');
          expect(body.data).not.toHaveProperty('passwordHash');
        });

      expect(authService.registerGuest).toHaveBeenCalledWith(expect.objectContaining(validBody));
    });

    it('trims whitespace around email and names before the service is called', async () => {
      authService.registerGuest.mockResolvedValue(createdUser);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...validBody, email: '  guest@example.com ', firstName: ' Fatima ', lastName: ' Alawi ' })
        .expect(201);

      expect(authService.registerGuest).toHaveBeenCalledWith(expect.objectContaining(validBody));
    });

    it.each([
      ['an invalid email', { email: 'not-an-email' }],
      ['a password shorter than 8 characters', { password: 'Ab1' }],
      ['a password without a number', { password: 'onlyletters' }],
      ['a password without a letter', { password: '12345678' }],
      ['a password longer than 72 characters', { password: 'A1' + 'a'.repeat(71) }],
      ['a missing first name', { firstName: '' }],
      ['a blank last name', { lastName: '   ' }],
    ])('rejects %s with 400 and does not call the service', async (_label, override) => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...validBody, ...override })
        .expect(400);

      expect(authService.registerGuest).not.toHaveBeenCalled();
    });

    it('rejects missing fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'guest@example.com' })
        .expect(400);

      expect(authService.registerGuest).not.toHaveBeenCalled();
    });

    it('does not let clients choose their own role or other protected fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...validBody, role: 'SUPER_ADMIN' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ ...validBody, isActive: true, isInstitutionalEmail: true })
        .expect(400);

      expect(authService.registerGuest).not.toHaveBeenCalled();
    });

    it('returns 409 when the email is already registered', async () => {
      authService.registerGuest.mockRejectedValue(
        new ConflictException('An account with this email already exists'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validBody)
        .expect(409)
        .expect(({ body }) => {
          expect(body.message).toBe('An account with this email already exists');
        });
    });
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

  it('redirects failed Google OAuth without creating a token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/google/callback?error=access_denied')
      .expect(302)
      .expect('Location', 'http://localhost:3000/auth/callback?error=google_auth_failed');

    expect(authService.generateTokens).not.toHaveBeenCalled();
  });
});
