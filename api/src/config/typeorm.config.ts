import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../modules/users/entities/user.entity';
import { Category } from '../modules/directory/entities/category.entity';
import { SubCategory } from '../modules/directory/entities/subcategory.entity';
import { Establishment } from '../modules/directory/entities/establishment.entity';
import { Landmark } from '../modules/navigation/entities/landmark.entity';
import { RouteNode } from '../modules/navigation/entities/route-node.entity';
import { RouteEdge } from '../modules/navigation/entities/route-edge.entity';
import { HazardReport } from '../modules/navigation/entities/hazard-report.entity';
import { AuditLog } from '../modules/admin/entities/audit-log.entity';
import { AuthSession } from '../modules/auth/entities/auth-session.entity';

export const allEntities = [
  User,
  Category,
  SubCategory,
  Establishment,
  Landmark,
  RouteNode,
  RouteEdge,
  HazardReport,
  AuditLog,
  AuthSession,
];

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'lalan_user'),
  password: configService.get<string>('DB_PASSWORD', 'lalan_password'),
  database: configService.get<string>('DB_DATABASE', 'msu_lalan_db'),
  entities: allEntities,
  synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
  logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
});
