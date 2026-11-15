import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminService } from './admin.service';
import { AuditAction, AuditLog } from './entities/audit-log.entity';
import {
  CampusAdminRequest,
  CampusAdminRequestStatus,
} from './entities/campus-admin-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthService } from '../auth/auth.service';

describe('AdminService', () => {
  const authService = {
    isEligibleCampusAdminEmail: (email: string) =>
      email.toLowerCase().trim().endsWith('@s.msumain.edu.ph'),
    getCampusAdminEmailDomain: () => 's.msumain.edu.ph',
  } as AuthService;
  const candidate = {
    id: 'employee-1',
    email: 'lacsaman.aa60@s.msumain.edu.ph',
    googleId: 'google-1',
    firstName: 'Amina',
    lastName: 'Lacsaman',
    avatarUrl: '',
    departmentAffiliation: 'Administration',
    role: UserRole.GENERAL_USER,
    isInstitutionalEmail: true,
    isActive: true,
    createdAt: new Date(),
  };

  it('lists only active, Google-linked eligible employees who are not admins', async () => {
    const repository = {
      find: jest.fn().mockResolvedValue([
        candidate,
        { ...candidate, id: 'student', email: 'student@msumain.edu.ph' },
        { ...candidate, id: 'no-google', googleId: null },
        { ...candidate, id: 'already-admin', role: UserRole.CAMPUS_ADMIN },
      ]),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as DataSource;
    const service = new AdminService(dataSource, authService);

    await expect(service.listCampusAdminCandidates()).resolves.toEqual([
      expect.objectContaining({ id: 'employee-1', email: candidate.email }),
    ]);
  });

  it('promotes an eligible employee and records the actor and eligibility basis atomically', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ ...candidate }),
      save: jest.fn(async (user) => user),
    };
    const auditRepository = {
      create: jest.fn((audit) => audit),
      save: jest.fn(async (audit) => audit),
    };
    const requestRepository = { update: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) return userRepository;
        if (entity === AuditLog) return auditRepository;
        return requestRepository;
      }),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    } as unknown as DataSource;
    const service = new AdminService(dataSource, authService);

    const result = await service.promoteToCampusAdmin(candidate.id, 'super-admin-1');

    expect(result.role).toBe(UserRole.CAMPUS_ADMIN);
    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.CAMPUS_ADMIN }),
    );
    expect(auditRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'User',
        entityId: candidate.id,
        action: AuditAction.UPDATE,
        userId: 'super-admin-1',
        previousValues: { role: UserRole.GENERAL_USER },
        newValues: expect.objectContaining({
          role: UserRole.CAMPUS_ADMIN,
          promotionSource: 'Google registration/sign-in',
          eligibilityBasis: expect.stringContaining('@s.msumain.edu.ph'),
        }),
      }),
    );
    expect(auditRepository.save).toHaveBeenCalled();
    expect(requestRepository.update).toHaveBeenCalledWith(
      { userId: candidate.id, status: CampusAdminRequestStatus.PENDING },
      { status: CampusAdminRequestStatus.PROMOTED },
    );
  });

  it('rejects non-employee accounts without changing their role', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        ...candidate,
        email: 'employee@msumain.edu.ph',
      }),
      save: jest.fn(),
    };
    const auditRepository = { create: jest.fn(), save: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity) => entity === User ? userRepository : auditRepository),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    } as unknown as DataSource;
    const service = new AdminService(dataSource, authService);

    await expect(service.promoteToCampusAdmin(candidate.id, 'super-admin-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(userRepository.save).not.toHaveBeenCalled();
    expect(auditRepository.save).not.toHaveBeenCalled();
  });

  it('accepts repeat requests idempotently for authenticated non-admin users', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({ ...candidate, isInstitutionalEmail: false }),
    };
    const requestRepository = {
      findOne: jest.fn().mockResolvedValue({
        status: CampusAdminRequestStatus.PENDING,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity) => entity === User ? userRepository : requestRepository),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    } as unknown as DataSource;
    const service = new AdminService(dataSource, authService);

    await expect(service.requestCampusAdminAccess(candidate.id)).resolves.toEqual({
      status: CampusAdminRequestStatus.PENDING,
      requestedAt: new Date('2026-01-01T00:00:00Z'),
    });
    expect(requestRepository.save).not.toHaveBeenCalled();
  });

  it('stores a request from an account without institutional verification for Super Admin review', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        ...candidate,
        email: 'person@example.com',
        googleId: null,
        isInstitutionalEmail: false,
      }),
    };
    const requestRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((request) => request),
      save: jest.fn(async (request) => ({
        ...request,
        createdAt: new Date('2026-02-01T00:00:00Z'),
      })),
    };
    const manager = {
      getRepository: jest.fn((entity) => entity === User ? userRepository : requestRepository),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    } as unknown as DataSource;
    const service = new AdminService(dataSource, authService);

    await expect(service.requestCampusAdminAccess(candidate.id)).resolves.toEqual({
      status: CampusAdminRequestStatus.PENDING,
      requestedAt: new Date('2026-02-01T00:00:00Z'),
    });
    expect(requestRepository.create).toHaveBeenCalledWith({
      userId: candidate.id,
      status: CampusAdminRequestStatus.PENDING,
    });
    expect(requestRepository.save).toHaveBeenCalled();
  });

  it('shows requests from unverified accounts but marks them ineligible', async () => {
    const repository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'request-1',
          createdAt: new Date(),
          user: {
            ...candidate,
            googleId: null,
            isInstitutionalEmail: false,
          },
        },
      ]),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as DataSource;
    const service = new AdminService(dataSource, authService);

    await expect(service.listCampusAdminRequests()).resolves.toEqual([
      expect.objectContaining({
        requestId: 'request-1',
        eligible: false,
        eligibilityReason: 'A verified Google sign-in is required.',
      }),
    ]);
  });
});
