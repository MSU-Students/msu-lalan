export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CAMPUS_ADMIN = 'CAMPUS_ADMIN',
  GENERAL_USER = 'GENERAL_USER',
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
