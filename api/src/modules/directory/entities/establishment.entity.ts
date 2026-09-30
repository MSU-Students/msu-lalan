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
import { Category } from './category.entity';
import { SubCategory } from './subcategory.entity';

@Entity('establishments')
export class Establishment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  acronym: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.establishments, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'uuid', nullable: true })
  subCategoryId: string;

  @ManyToOne(() => SubCategory, (subCategory) => subCategory.establishments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'subCategoryId' })
  subCategory: SubCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buildingName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  floorLevel: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  roomNumber: string;

  // Spatial coordinates (Indexed for proximity queries)
  @Index()
  @Column({ type: 'double precision' })
  entranceLatitude: number;

  @Index()
  @Column({ type: 'double precision' })
  entranceLongitude: number;

  @Column({ type: 'double precision', nullable: true })
  centerLatitude: number;

  @Column({ type: 'double precision', nullable: true })
  centerLongitude: number;

  // GeoJSON representation of building perimeter / polygon
  @Column({ type: 'jsonb', nullable: true })
  perimeterPolygon: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  operatingHours: Record<string, { open: string; close: string; isClosed?: boolean }>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  websiteUrl: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  imageUrls: string[];

  @Index()
  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  archivedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserId: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
