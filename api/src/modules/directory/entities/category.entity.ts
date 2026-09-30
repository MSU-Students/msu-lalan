import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { SubCategory } from './subcategory.entity';
import { Establishment } from './establishment.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  colorHex: string;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @OneToMany(() => SubCategory, (subCategory) => subCategory.category)
  subCategories: SubCategory[];

  @OneToMany(() => Establishment, (establishment) => establishment.category)
  establishments: Establishment[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
