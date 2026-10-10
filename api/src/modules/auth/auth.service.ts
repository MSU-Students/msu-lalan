import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponseDto, JwtPayload } from './dto/auth-response.dto';
import { AuthSession } from './entities/auth-session.entity';

export interface IssuedAuthTokens extends AuthResponseDto {
  refreshToken: string;
}

export interface GoogleProfileDto {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(AuthSession)
    private sessionsRepository: Repository<AuthSession>,
  ) {}

  isInstitutionalEmail(email: string): boolean {
    const allowedDomain = this.configService.get<string>('ALLOWED_DOMAIN', 'msumain.edu.ph').toLowerCase();
    const normalizedEmail = email.toLowerCase().trim();
    return normalizedEmail.endsWith(`@${allowedDomain}`) || normalizedEmail.endsWith(`.${allowedDomain}`);
  }

  async validateOrCreateGoogleUser(profile: GoogleProfileDto): Promise<User> {
    const normalizedEmail = profile.email.toLowerCase().trim();
    const isInstitutional = this.isInstitutionalEmail(normalizedEmail);

    let user = await this.usersService.findByEmailOrGoogleId(normalizedEmail, profile.googleId);

    if (user) {
      user.googleId = profile.googleId;
      user.firstName = profile.firstName || user.firstName;
      user.lastName = profile.lastName || user.lastName;
      user.avatarUrl = profile.avatarUrl || user.avatarUrl;
      user.isInstitutionalEmail = isInstitutional;
      return this.usersService.save(user);
    }

    user = this.usersService.create({
      email: normalizedEmail,
      googleId: profile.googleId,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      avatarUrl: profile.avatarUrl || '',
      role: UserRole.GENERAL_USER,
      isInstitutionalEmail: isInstitutional,
      isActive: true,
    });

    return this.usersService.save(user);
  }

  async validateJwtUser(userId: string): Promise<User | null> {
    return this.usersService.findActiveById(userId);
  }

  async loginWithPassword(username: string, password: string): Promise<IssuedAuthTokens> {
    const normalizedEmail = username.toLowerCase().trim();
    const user = await this.usersService.findActiveByEmailWithPasswordHash(normalizedEmail);

    if (
      !user ||
      !user.passwordHash ||
      Buffer.byteLength(password, 'utf8') > 72 ||
      !(await compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.generateTokens(user);
  }

  async generateTokens(user: User): Promise<IssuedAuthTokens> {
    const refreshToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const session = await this.sessionsRepository.save(
      this.sessionsRepository.create({
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(now.getTime() + this.getRefreshTtlSeconds() * 1000),
        revokedAt: null,
      }),
    );

    return this.createAuthTokens(user, session.id, refreshToken);
  }

  async refreshTokens(refreshToken: string | undefined): Promise<IssuedAuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const now = new Date();
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.sessionsRepository.findOne({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
    });
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findActiveById(session.userId);
    if (!user) {
      await this.sessionsRepository.update(
        { id: session.id, revokedAt: IsNull() },
        { revokedAt: now },
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const nextRefreshToken = randomBytes(32).toString('base64url');
    const rotation = await this.sessionsRepository.update(
      {
        id: session.id,
        refreshTokenHash: tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      { refreshTokenHash: this.hashToken(nextRefreshToken) },
    );
    if (rotation.affected !== 1) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.createAuthTokens(user, session.id, nextRefreshToken);
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.sessionsRepository.update(
      { id: sessionId, userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async validateJwtSession(sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    const session = await this.sessionsRepository.findOne({
      where: {
        id: sessionId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      select: { id: true },
    });
    return !!session;
  }

  getRefreshTtlSeconds(): number {
    const configuredTtl = Number(this.configService.get('JWT_REFRESH_TTL_SECONDS', 2592000));
    return Number.isSafeInteger(configuredTtl) && configuredTtl > 0 ? configuredTtl : 2592000;
  }

  private createAuthTokens(user: User, sessionId: string, refreshToken: string): IssuedAuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isInstitutionalEmail: user.isInstitutionalEmail,
      sid: sessionId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isInstitutionalEmail: user.isInstitutionalEmail,
        departmentAffiliation: user.departmentAffiliation,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
