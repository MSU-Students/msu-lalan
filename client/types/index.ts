export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CAMPUS_ADMIN = 'CAMPUS_ADMIN',
  GENERAL_USER = 'GENERAL_USER',
  GUEST = 'GUEST',
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: UserRole;
  isInstitutionalEmail: boolean;
  departmentAffiliation?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResult {
  success: boolean;
  message: string;
  status?: number;
}

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface EstablishmentSummary {
  id: string;
  name: string;
  acronym?: string;
  category: string;
  subCategory?: string;
  entranceLatitude: number;
  entranceLongitude: number;
  buildingName?: string;
}
