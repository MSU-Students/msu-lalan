import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: any;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-signed-jwt-token'),
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
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      mockUserRepository.findOne.mockResolvedValue(null);

      const mockCreatedUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'juan.delacruz@msumain.edu.ph',
        googleId: 'google-1001',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        avatarUrl: 'https://example.com/photo.jpg',
        role: UserRole.GENERAL_USER,
        isInstitutionalEmail: true,
        isActive: true,
        departmentAffiliation: null,
        auditLogs: [],
        hazardReports: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.create.mockReturnValue(mockCreatedUser);
      mockUserRepository.save.mockResolvedValue(mockCreatedUser);

      const result = await service.validateOrCreateGoogleUser({
        googleId: 'google-1001',
        email: 'juan.delacruz@msumain.edu.ph',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        avatarUrl: 'https://example.com/photo.jpg',
      });

      expect(mockUserRepository.findOne).toHaveBeenCalled();
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
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

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue({
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

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.role).toBe(UserRole.CAMPUS_ADMIN);
      expect(result.avatarUrl).toBe('https://example.com/new-avatar.jpg');
    });
  });

  describe('generateTokens', () => {
    it('should generate JWT access token and return user profile payload', () => {
      const testUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'admin@msumain.edu.ph',
        googleId: 'google-1003',
        firstName: 'Admin',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: UserRole.SUPER_ADMIN,
        departmentAffiliation: 'Information & Communication Technology Center',
        isInstitutionalEmail: true,
        isActive: true,
        auditLogs: [],
        hazardReports: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.generateTokens(testUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: testUser.id,
        email: testUser.email,
        role: testUser.role,
        isInstitutionalEmail: testUser.isInstitutionalEmail,
      });

      expect(result.accessToken).toBe('mock-signed-jwt-token');
      expect(result.user.email).toBe('admin@msumain.edu.ph');
      expect(result.user.role).toBe(UserRole.SUPER_ADMIN);
      expect(result.user.departmentAffiliation).toBe('Information & Communication Technology Center');
    });
  });
});
