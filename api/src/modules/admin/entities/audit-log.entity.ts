import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
  DELETE = 'DELETE',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  entityName: string; // e.g., 'Establishment', 'Category', 'RouteNode'

  @Index()
  @Column({ type: 'varchar', length: 100 })
  entityId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'jsonb', nullable: true })
  previousValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.auditLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;
}
