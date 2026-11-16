import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request = require('supertest');
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('AuthController', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const authService = {
    registerGuest: jest.fn(),
    loginWithPassword: jest.fn(),
    generateTokens: jest.fn(),
    refreshTokens: jest.fn(),
    getRefreshTtlSeconds: jest.fn().mockReturnValue(2592000),
    logout: jest.fn(),
    validateJwtSession: jest.fn(),
    validateJwtUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    authService.getRefreshTtlSeconds.mockReturnValue(2592000); // 30 days in seconds

    const testingModule = Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: 'test-secret' }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback: string) => {
              if (key === 'FRONTEND_URL') return 'http://localhost:3000';
              if (key === 'JWT_SECRET') return 'test-secret';
              return fallback;
            }),
          },
        },
        JwtStrategy,
        { provide: GoogleAuthGuard, useValue: { canActive: () => true } },
        { provide: RolesGuard, useValue: { canActive: () => true } },
      ],
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

    jwtService = module.get<JwtService>(JwtService);
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

  describe('POST /auth/login', () => {
    it('returns tokens in JSON without setting cookies on successful login', async () => {
      const authResponse = {
        accessToken: 'signed-token',
        refreshToken: 'secret-refresh-token',
        user: {
          id: 'user-1',
          email: 'students@msumain.edu.ph',
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
        .expect(({ body, headers }) => {
          expect(body.accessToken).toBe('signed-token');
          expect(body.refreshToken).toBe('secret-refresh-token');
          expect(body.user.id).toBe('user-1');
          expect(headers['set-cookie']).toBeUndefined();
        });
    });

    it('returns unauthorized without tokens for invalid credentials', async () => {
      authService.loginWithPassword.mockRejectedValue(
        new UnauthorizedException('Invalid username or password'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username: 'student@msumain.edu.ph', password: 'wrong-password' })
        .expect(401)
        .expect(({ body, headers }) => {
          expect(body.message).toBe('Invalid username or password');
          expect(body.accessToken).toBeUndefined();
          expect(headers['set-cookie']).toBeUndefined();
        });
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates tokens via Bearer header and returns them in JSON without setting cookies', async () => {
      authService.refreshTokens.mockResolvedValue({
        accessToken: 'replacement-token',
        refreshToken: 'replacement-refresh-secret',
        user: { id: 'user-1', email: 'student@msumain.edu.ph' },
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer current-refresh-secret')
        .expect(200)
        .expect(({ body, headers }) => {
          expect(body.accessToken).toBe('replacement-token');
          expect(body.refreshToken).toBe('replacement-refresh-secret');
          expect(headers['set-cookie']).toBeUndefined();
        });

      expect(authService.refreshTokens).toHaveBeenCalledWith('current-refresh-secret');
    });

    it('ignores cookies and fails if the Bearer refresh token is missing', async () => {
      authService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'msu_lalan_refresh=cookie-secret')
        .expect(401);
        
      expect(authService.refreshTokens).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Protected Routes (Real JwtAuthGuard Evaluation)', () => {
    let validToken: string;

    beforeEach(() => {
      validToken = jwtService.sign({ sub: 'user-1', sid: 'session-1'});
      authService.validateJwtSession.mockResolvedValue(true);
      authService.validateJwtUser.mockResolvedValue({ id: 'user-1', email: 'student@msumain.edu.ph' });
    });

    it('allows requests with a valid Bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('rejects requests with missing tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('rejects requests with malformed tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer not-a-valid-jwt-format')
        .expect(401);
    });

    it('rejects requests with invalid signatures', async () => {
      const invalidToken = validToken.slice(0, -5) + 'xxxxx';
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('rejects expired tokens', async () => {
      const expiredToken = jwtService.sign(
        { sub: 'user-1', sid: 'session-1' },
        { expiresIn: '-1h' },
      );
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('ignores tokens sent only in cookies', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `access_token=${validToken}`)
        .expect(401);
    });

    it('ignores tokens sent only in query parameters', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/auth/logout?token=${validToken}`)
        .expect(401);
    });

    it('ignores tokens sent only in the request body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ token: validToken })
        .expect(401);
    });

    it('revokes the session on logout without clearing or setting cookies', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200)
        .expect(({ body, headers }) => {
          expect(body.message).toBe('Logged out successfully');
          expect(headers['set-cookie']).toBeUndefined();
        });

      expect(authService.logout).toHaveBeenCalledWith('session-1', 'user-1');
    });
  });

  describe('GET /auth/google/callback', () => {
    it('redirects failed Google OAuth without creating a token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/google/callback?error=access_denied')
        .expect(302)
        .expect('Location', 'http://localhost:3000/auth/callback?error=google_auth_failed');

      expect(authService.generateTokens).not.toHaveBeenCalled();
    });
  });
});