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
  };

  beforeEach(async () => {
    authService.loginWithPassword.mockReset();

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: GoogleAuthGuard, useValue: {} },
        { provide: JwtAuthGuard, useValue: {} },
        { provide: RolesGuard, useValue: {} },
      ],
    }).compile();

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
      .expect(authResponse);

    expect(authService.loginWithPassword).toHaveBeenCalledWith(
      'student@msumain.edu.ph',
      'valid-password',
    );
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