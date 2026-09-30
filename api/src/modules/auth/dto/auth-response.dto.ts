import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  isInstitutionalEmail: boolean;
}

export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    role: UserRole;
    isInstitutionalEmail: boolean;
    departmentAffiliation?: string;
  };
}
