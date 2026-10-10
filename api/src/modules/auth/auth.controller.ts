import {
  Controller,
  Body,
  Get,
  Post,
  HttpCode,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly refreshCookieName = 'msu_lalan_refresh';

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Sign in with username and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid username or password' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { refreshToken, ...authResponse } = await this.authService.loginWithPassword(
      loginDto.username,
      loginDto.password,
    );
    res.cookie(this.refreshCookieName, refreshToken, this.refreshCookieOptions());
    return authResponse;
  }

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
    const authData = await this.authService.generateTokens(req.user as User);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    res.cookie(this.refreshCookieName, authData.refreshToken, this.refreshCookieOptions());

    // Redirect to frontend auth callback page with token
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${authData.accessToken}&role=${authData.user.role}`,
    );
  }

  @ApiOperation({ summary: 'Refresh the current session and rotate its refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing, expired, or revoked refresh token' })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...authResponse } = await this.authService.refreshTokens(
      this.readRefreshToken(req),
    );
    res.cookie(this.refreshCookieName, refreshToken, this.refreshCookieOptions());
    return authResponse;
  }

  @ApiOperation({ summary: 'Log out and invalidate the current session' })
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Session invalidated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: User & { sessionId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sessionId, user.id);
    res.clearCookie(this.refreshCookieName, this.refreshCookieOptions(false));
    return { statusCode: HttpStatus.OK, message: 'Logged out successfully' };
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

  private refreshCookieOptions(includeMaxAge = true) {
    const apiPrefix = this.configService.get<string>('API_PREFIX', 'api/v1');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    return {
      httpOnly: true,
      secure: nodeEnv === 'production',
      sameSite: 'lax' as const,
      path: `/${apiPrefix}/auth`,
      ...(includeMaxAge ? { maxAge: this.authService.getRefreshTtlSeconds() * 1000 } : {}),
    };
  }

  private readRefreshToken(req: Request): string | undefined {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return undefined;

    const cookie = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${this.refreshCookieName}=`));
    return cookie?.slice(this.refreshCookieName.length + 1);
  }
}
