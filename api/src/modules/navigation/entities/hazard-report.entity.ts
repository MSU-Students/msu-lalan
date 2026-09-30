import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum HazardType {
  ROAD_CLOSURE = 'ROAD_CLOSURE',
  CONSTRUCTION = 'CONSTRUCTION',
  FLOODING = 'FLOODING',
  DEBRIS = 'DEBRIS',
  STEEP_SLOPE = 'STEEP_SLOPE',
  OTHER = 'OTHER',
}

export enum HazardStatus {
  REPORTED = 'REPORTED',
  VERIFIED = 'VERIFIED',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

@Entity('hazard_reports')
export class HazardReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: HazardType,
    default: HazardType.ROAD_CLOSURE,
  })
  hazardType: HazardType;

  @Column({
    type: 'enum',
    enum: HazardStatus,
    default: HazardStatus.REPORTED,
  })
  status: HazardStatus;

  @Index()
  @Column({ type: 'double precision' })
  latitude: number;

  @Index()
  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expectedResolutionDate: Date;

  @Column({ type: 'uuid' })
  reportedByUserId: string;

  @ManyToOne(() => User, (user) => user.hazardReports, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reportedByUserId' })
  reportedBy: User;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
