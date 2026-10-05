import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AuditLog } from '../../admin/entities/audit-log.entity';
import { HazardReport } from '../../navigation/entities/hazard-report.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CAMPUS_ADMIN = 'CAMPUS_ADMIN',
  GENERAL_USER = 'GENERAL_USER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  googleId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.GENERAL_USER,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  departmentAffiliation: string;

  @Column({ type: 'boolean', default: false })
  isInstitutionalEmail: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => AuditLog, (audit) => audit.user)
  auditLogs: AuditLog[];

  @OneToMany(() => HazardReport, (hazard) => hazard.reportedBy)
  hazardReports: HazardReport[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
