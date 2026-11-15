import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';

@ApiTags('Administration')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('campus-admin-requests/me')
  @ApiOperation({ summary: 'Get the current user’s Campus Admin access request' })
  async getMyCampusAdminRequest(@CurrentUser() user: User) {
    return {
      statusCode: 200,
      data: await this.adminService.getCurrentCampusAdminRequest(user.id),
    };
  }

  @Post('campus-admin-requests')
  @ApiOperation({ summary: 'Request Campus Admin access for the current account' })
  async requestCampusAdminAccess(@CurrentUser() user: User) {
    return {
      statusCode: 201,
      message: 'Campus Admin access request submitted',
      data: await this.adminService.requestCampusAdminAccess(user.id),
    };
  }

  @Get('campus-admin-candidates')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiForbiddenResponse({ description: 'Only Super Admins can list Campus Admin candidates' })
  @ApiOperation({ summary: 'List Google-verified institutional accounts eligible for Campus Admin' })
  async listCampusAdminCandidates() {
    return {
      statusCode: 200,
      data: await this.adminService.listCampusAdminCandidates(),
    };
  }

  @Get('campus-admin-requests')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiForbiddenResponse({ description: 'Only Super Admins can review Campus Admin requests' })
  @ApiOperation({ summary: 'List pending Campus Admin access requests and eligibility results' })
  async listCampusAdminRequests() {
    return {
      statusCode: 200,
      data: await this.adminService.listCampusAdminRequests(),
    };
  }

  @Post('users/:userId/promote-campus-admin')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiForbiddenResponse({ description: 'Only Super Admins can promote Campus Admins' })
  @ApiOperation({ summary: 'Promote an eligible institutional account to Campus Admin' })
  async promoteToCampusAdmin(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() actor: User,
  ) {
    return {
      statusCode: 200,
      message: 'User promoted to Campus Admin',
      data: await this.adminService.promoteToCampusAdmin(userId, actor.id),
    };
  }
}
