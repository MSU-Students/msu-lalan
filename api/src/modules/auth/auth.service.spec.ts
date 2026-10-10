import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthSession } from './entities/auth-session.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockSessionsRepository: any;

  beforeEach(async () => {
    mockUsersService = {
      findByEmailOrGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      findActiveByEmailWithPasswordHash: jest.fn(),
      findActiveById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-signed-jwt-token'),
    };

    mockSessionsRepository = {
      create: jest.fn((session) => session),
      save: jest.fn(async (session) => ({ ...session, id: 'session-1' })),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'ALLOWED_DOMAIN') return 'msumain.edu.ph';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(AuthSession),
          useValue: mockSessionsRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginWithPassword', () => {
    const loginUser: User = {
      id: 'user-1',
      email: 'student@msumain.edu.ph',
      googleId: null,
      firstName: 'Student',
      lastName: 'User',
      avatarUrl: '',
      passwordHash: '$2b$12$hashed-password',
      role: UserRole.GENERAL_USER,
      departmentAffiliation: null,
      isInstitutionalEmail: true,
      isActive: true,
      auditLogs: [],
      hazardReports: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      jest.mocked(compare).mockReset();
      mockUsersService.findActiveByEmailWithPasswordHash.mockReset();
    });

    it('normalizes the email, verifies the password, and returns JWT auth data', async () => {
      mockUsersService.findActiveByEmailWithPasswordHash.mockResolvedValue(loginUser);
      (compare as jest.Mock).mockResolvedValue(true);

      const result = await service.loginWithPassword(' Student@MSUMAIN.EDU.PH ', 'correct-password');

      expect(mockUsersService.findActiveByEmailWithPasswordHash).toHaveBeenCalledWith(
        'student@msumain.edu.ph',
      );
      expect(compare).toHaveBeenCalledWith('correct-password', loginUser.passwordHash);
      expect(result.accessToken).toBe('mock-signed-jwt-token');
      expect(result.user.email).toBe(loginUser.email);
    });

    it('rejects unknown accounts and accounts without a password hash generically', async () => {
      mockUsersService.findActiveByEmailWithPasswordHash.mockResolvedValue(null);
      await expect(service.loginWithPassword(loginUser.email, 'password')).rejects.toThrow(
        'Invalid username or password',
      );

      mockUsersService.findActiveByEmailWithPasswordHash.mockResolvedValue({
        ...loginUser,
        passwordHash: null,
      });
      await expect(service.loginWithPassword(loginUser.email, 'password')).rejects.toThrow(
        'Invalid username or password',
      );
      expect(compare).not.toHaveBeenCalled();
    });

    it('rejects incorrect passwords generically', async () => {
      mockUsersService.findActiveByEmailWithPasswordHash.mockResolvedValue(loginUser);
      (compare as jest.Mock).mockResolvedValue(false);

      await expect(service.loginWithPassword(loginUser.email, 'incorrect-password')).rejects.toThrow(
        'Invalid username or password',
      );
    });

    it('rejects passwords exceeding bcrypt input length before comparison', async () => {
      mockUsersService.findActiveByEmailWithPasswordHash.mockResolvedValue(loginUser);

      await expect(service.loginWithPassword(loginUser.email, 'é'.repeat(37))).rejects.toThrow(
        'Invalid username or password',
      );
      expect(compare).not.toHaveBeenCalled();
    });
  });

  describe('isInstitutionalEmail', () => {
    it('should return true for @msumain.edu.ph email address', () => {
      expect(service.isInstitutionalEmail('student@msumain.edu.ph')).toBe(true);
      expect(service.isInstitutionalEmail('faculty.member@msumain.edu.ph')).toBe(true);
      expect(service.isInstitutionalEmail('ADMIN@MSUMAIN.EDU.PH')).toBe(true);
    });

    it('should return false for non-institutional email addresses', () => {
      expect(service.isInstitutionalEmail('guest@gmail.com')).toBe(false);
      expect(service.isInstitutionalEmail('user@yahoo.com')).toBe(false);
      expect(service.isInstitutionalEmail('fake@otherdomain.edu.ph')).toBe(false);
    });
  });

  describe('validateOrCreateGoogleUser', () => {
    it('should create a new user if user does not exist', async () => {
      mockUsersService.findByEmailOrGoogleId.mockResolvedValue(null);

      const mockCreatedUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'juan.delacruz@msumain.edu.ph',
        googleId: 'google-1001',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        avatarUrl: 'https://example.com/photo.jpg',
        passwordHash: null,
        role: UserRole.GENERAL_USER,
        isInstitutionalEmail: true,
        isActive: true,
        departmentAffiliation: null,
        auditLogs: [],
        hazardReports: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockReturnValue(mockCreatedUser);
      mockUsersService.save.mockResolvedValue(mockCreatedUser);

      const result = await service.validateOrCreateGoogleUser({
        googleId: 'google-1001',
        email: 'juan.delacruz@msumain.edu.ph',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        avatarUrl: 'https://example.com/photo.jpg',
      });

      expect(mockUsersService.findByEmailOrGoogleId).toHaveBeenCalledWith(
        'juan.delacruz@msumain.edu.ph',
        'google-1001',
      );
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockUsersService.save).toHaveBeenCalled();
      expect(result.email).toBe('juan.delacruz@msumain.edu.ph');
      expect(result.isInstitutionalEmail).toBe(true);
      expect(result.role).toBe(UserRole.GENERAL_USER);
    });

    it('should update and return existing user if user is found', async () => {
      const existingUser: Partial<User> = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'encoder@msumain.edu.ph',
        googleId: 'google-1002',
        firstName: 'Maria',
        lastName: 'Santos',
        avatarUrl: '',
        role: UserRole.CAMPUS_ADMIN,
        isInstitutionalEmail: true,
        isActive: true,
      };

      mockUsersService.findByEmailOrGoogleId.mockResolvedValue(existingUser);
      mockUsersService.save.mockResolvedValue({
        ...existingUser,
        avatarUrl: 'https://example.com/new-avatar.jpg',
      });

      const result = await service.validateOrCreateGoogleUser({
        googleId: 'google-1002',
        email: 'encoder@msumain.edu.ph',
        firstName: 'Maria',
        lastName: 'Santos',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      });

      expect(mockUsersService.create).not.toHaveBeenCalled();
      expect(mockUsersService.save).toHaveBeenCalled();
      expect(result.role).toBe(UserRole.CAMPUS_ADMIN);
      expect(result.avatarUrl).toBe('https://example.com/new-avatar.jpg');
    });
  });

  describe('generateTokens', () => {
    it('creates a persisted session and returns an access token and user profile', async () => {
      const testUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@msumain.edu.ph',
        googleId: 'google-1003',
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
        passwordHash: null,
        role: UserRole.SUPER_ADMIN,
        departmentAffiliation: 'Information & Communication Technology Center',
        isInstitutionalEmail: true,
        isActive: true,
        auditLogs: [],
        hazardReports: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.generateTokens(testUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: testUser.id,
        email: testUser.email,
        role: testUser.role,
        isInstitutionalEmail: testUser.isInstitutionalEmail,
        sid: 'session-1',
      });
      expect(mockSessionsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: testUser.id, refreshTokenHash: expect.any(String) }),
      );

      expect(result.accessToken).toBe('mock-signed-jwt-token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user.email).toBe('admin@msumain.edu.ph');
      expect(result.user.role).toBe(UserRole.SUPER_ADMIN);
      expect(result.user.departmentAffiliation).toBe('Information & Communication Technology Center');
    });

    it('rotates the refresh token while retaining the existing session', async () => {
      const testUser: User = {
        id: 'user-1',
        email: 'student@msumain.edu.ph',
        googleId: null,
        firstName: 'Student',
        lastName: 'User',
        avatarUrl: '',
        passwordHash: null,
        role: UserRole.GENERAL_USER,
        departmentAffiliation: null,
        isInstitutionalEmail: true,
        isActive: true,
        auditLogs: [],
        hazardReports: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSessionsRepository.findOne.mockResolvedValue({ id: 'session-1', userId: testUser.id });
      mockUsersService.findActiveById.mockResolvedValue(testUser);

      const result = await service.refreshTokens('current-refresh-token');

      expect(mockSessionsRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'session-1', refreshTokenHash: expect.any(String) }),
        { refreshTokenHash: expect.any(String) },
      );
      expect(result.accessToken).toBe('mock-signed-jwt-token');
      expect(result.refreshToken).not.toBe('current-refresh-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(expect.objectContaining({ sid: 'session-1' }));
    });

    it('rejects a refresh token that does not match an active session', async () => {
      mockSessionsRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshTokens('revoked-refresh-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
      expect(mockSessionsRepository.update).not.toHaveBeenCalled();
    });

    it('revokes the current session on logout', async () => {
      await service.logout('session-1', 'user-1');

      expect(mockSessionsRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'session-1', userId: 'user-1' }),
        { revokedAt: expect.any(Date) },
      );
    });

    it('rejects revoked or expired access-token sessions', async () => {
      mockSessionsRepository.findOne.mockResolvedValue(null);

      await expect(service.validateJwtSession('session-1')).resolves.toBe(false);
      expect(mockSessionsRepository.findOne).toHaveBeenCalled();
    });
  });
});
