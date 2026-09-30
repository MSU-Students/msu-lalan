import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('landmarks')
export class Landmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Index()
  @Column({ type: 'double precision' })
  latitude: number;

  @Index()
  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string;

  @Column({ type: 'int', default: 1 })
  visualProminenceScore: number; // 1-10 rating for pathfinding anchor hints

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
