import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthResponseDto, JwtPayload } from './dto/auth-response.dto';

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  isInstitutionalEmail(email: string): boolean {
    const allowedDomain = this.configService.get<string>('ALLOWED_DOMAIN', 'msumain.edu.ph').toLowerCase();
    const normalizedEmail = email.toLowerCase().trim();
    return normalizedEmail.endsWith(`@${allowedDomain}`) || normalizedEmail.endsWith(`.${allowedDomain}`);
  }

  async validateOrCreateGoogleUser(profile: GoogleProfileDto): Promise<User> {
    const normalizedEmail = profile.email.toLowerCase().trim();
    const isInstitutional = this.isInstitutionalEmail(normalizedEmail);

    let user = await this.userRepository.findOne({
      where: [{ email: normalizedEmail }, { googleId: profile.googleId }],
    });

    if (user) {
      user.googleId = profile.googleId;
      user.firstName = profile.firstName || user.firstName;
      user.lastName = profile.lastName || user.lastName;
      user.avatarUrl = profile.avatarUrl || user.avatarUrl;
      user.isInstitutionalEmail = isInstitutional;
      return this.userRepository.save(user);
    }

    user = this.userRepository.create({
      email: normalizedEmail,
      googleId: profile.googleId,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      avatarUrl: profile.avatarUrl || '',
      role: UserRole.GENERAL_USER,
      isInstitutionalEmail: isInstitutional,
      isActive: true,
    });

    return this.userRepository.save(user);
  }

  async validateJwtUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, isActive: true },
    });
  }

  generateTokens(user: User): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      isInstitutionalEmail: user.isInstitutionalEmail,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
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
}
