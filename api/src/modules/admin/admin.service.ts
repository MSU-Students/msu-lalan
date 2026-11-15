import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditAction, AuditLog } from './entities/audit-log.entity';
import {
  CampusAdminRequest,
  CampusAdminRequestStatus,
} from './entities/campus-admin-request.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthService } from '../auth/auth.service';

export interface CampusAdminCandidate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  departmentAffiliation: string;
  role: UserRole;
  createdAt: Date;
}

export interface CampusAdminRequestReview extends CampusAdminCandidate {
  requestId: string;
  requestedAt: Date;
  eligible: boolean;
  eligibilityReason: string;
}

@Injectable()
export class AdminService {
  constructor(
    private dataSource: DataSource,
    private authService: AuthService,
  ) {}

  async listCampusAdminCandidates(): Promise<CampusAdminCandidate[]> {
    const users = await this.dataSource.getRepository(User).find({
      where: { isInstitutionalEmail: true, isActive: true },
      order: { createdAt: 'DESC' },
    });

    return users
      .filter(
        (user) =>
          user.googleId &&
          this.authService.isEligibleCampusAdminEmail(user.email) &&
          user.role !== UserRole.CAMPUS_ADMIN &&
          user.role !== UserRole.SUPER_ADMIN,
      )
      .map(({ id, email, firstName, lastName, avatarUrl, departmentAffiliation, role, createdAt }) => ({
        id,
        email,
        firstName,
        lastName,
        avatarUrl,
        departmentAffiliation,
        role,
        createdAt,
      }));
  }

  async listCampusAdminRequests(): Promise<CampusAdminRequestReview[]> {
    const requests = await this.dataSource.getRepository(CampusAdminRequest).find({
      where: { status: CampusAdminRequestStatus.PENDING },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });

    return requests.map(({ id: requestId, createdAt: requestedAt, user }) => ({
      ...this.toCandidate(user),
      requestId,
      requestedAt,
      ...this.getEligibility(user),
    }));
  }

  async getCurrentCampusAdminRequest(userId: string): Promise<{ status: CampusAdminRequestStatus; requestedAt: Date } | null> {
    const request = await this.dataSource.getRepository(CampusAdminRequest).findOne({
      where: { userId },
    });

    if (request?.status === CampusAdminRequestStatus.PROMOTED) {
      const user = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
      if (user?.role !== UserRole.CAMPUS_ADMIN && user?.role !== UserRole.SUPER_ADMIN) {
        return null;
      }
    }

    return request
      ? { status: request.status, requestedAt: request.createdAt }
      : null;
  }

  async requestCampusAdminAccess(
    userId: string,
  ): Promise<{ status: CampusAdminRequestStatus; requestedAt: Date }> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user || !user.isActive) {
        throw new NotFoundException('Active user account not found');
      }
      if (user.role === UserRole.CAMPUS_ADMIN || user.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Administrator accounts do not need to request access');
      }

      const requestsRepository = manager.getRepository(CampusAdminRequest);
      const existingRequest = await requestsRepository.findOne({ where: { userId } });
      if (existingRequest) {
        if (existingRequest.status === CampusAdminRequestStatus.PROMOTED) {
          existingRequest.status = CampusAdminRequestStatus.PENDING;
          const reopened = await requestsRepository.save(existingRequest);
          return { status: reopened.status, requestedAt: reopened.createdAt };
        }
        return { status: existingRequest.status, requestedAt: existingRequest.createdAt };
      }

      const request = await requestsRepository.save(
        requestsRepository.create({
          userId,
          status: CampusAdminRequestStatus.PENDING,
        }),
      );
      return { status: request.status, requestedAt: request.createdAt };
    });
  }

  async promoteToCampusAdmin(userId: string, actorId: string): Promise<CampusAdminCandidate> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user || !user.isActive) {
        throw new NotFoundException('Eligible user account not found');
      }

      if (
        !user.googleId ||
        !user.isInstitutionalEmail ||
        !this.authService.isEligibleCampusAdminEmail(user.email) ||
        user.role === UserRole.SUPER_ADMIN
      ) {
        throw new ForbiddenException('This account is not eligible for Campus Admin promotion');
      }

      if (user.role !== UserRole.CAMPUS_ADMIN) {
        const previousRole = user.role;
        user.role = UserRole.CAMPUS_ADMIN;
        await manager.getRepository(User).save(user);
        await manager.getRepository(AuditLog).save(
          manager.getRepository(AuditLog).create({
            entityName: 'User',
            entityId: user.id,
            action: AuditAction.UPDATE,
            previousValues: { role: previousRole },
            newValues: {
              role: UserRole.CAMPUS_ADMIN,
              promotionSource: 'Google registration/sign-in',
              eligibilityBasis: `Verified Google email on @${this.authService.getCampusAdminEmailDomain()} domain`,
            },
            userId: actorId,
          }),
        );
      }

      await manager.getRepository(CampusAdminRequest).update(
        { userId: user.id, status: CampusAdminRequestStatus.PENDING },
        { status: CampusAdminRequestStatus.PROMOTED },
      );

      return this.toCandidate(user);
    });
  }

  private getEligibility(user: User): { eligible: boolean; eligibilityReason: string } {
    if (!user.isActive) {
      return { eligible: false, eligibilityReason: 'This account is inactive.' };
    }
    if (!user.googleId) {
      return { eligible: false, eligibilityReason: 'A verified Google sign-in is required.' };
    }
    if (!user.isInstitutionalEmail) {
      return { eligible: false, eligibilityReason: 'Google has not verified an institutional email for this account.' };
    }
    if (!this.authService.isEligibleCampusAdminEmail(user.email)) {
      return {
        eligible: false,
        eligibilityReason: `Only verified @${this.authService.getCampusAdminEmailDomain()} accounts are eligible.`,
      };
    }
    if (user.role === UserRole.CAMPUS_ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return { eligible: false, eligibilityReason: 'This account already has an administrator role.' };
    }
    return {
      eligible: true,
      eligibilityReason: `Verified Google email on @${this.authService.getCampusAdminEmailDomain()} domain.`,
    };
  }

  private toCandidate(user: User): CampusAdminCandidate {
    const {
      id,
      email,
      firstName,
      lastName,
      avatarUrl,
      departmentAffiliation,
      role,
      createdAt,
    } = user;
    return { id, email, firstName, lastName, avatarUrl, departmentAffiliation, role, createdAt };
  }
}
