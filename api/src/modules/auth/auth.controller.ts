import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Initiate Google OAuth 2.0 login' })
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Initiates Passport Google OAuth2 redirect flow
  }

  @ApiOperation({ summary: 'Google OAuth 2.0 callback URL' })
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const authData = this.authService.generateTokens(req.user as User);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    // Redirect to frontend auth callback page with token
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${authData.accessToken}&role=${authData.user.role}`,
    );
  }

  @ApiOperation({ summary: 'Get profile of current authenticated user' })
  @ApiBearerAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return {
      statusCode: HttpStatus.OK,
      data: {
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

  @ApiOperation({ summary: 'Protected health check for Admin roles (RBAC verification)' })
  @ApiBearerAuth()
  @Get('admin/verify-access')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CAMPUS_ADMIN)
  async verifyAdminAccess(@CurrentUser() user: User) {
    return {
      statusCode: HttpStatus.OK,
      message: 'Admin authorization verified',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
