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
import { RouteNode } from './route-node.entity';

export enum EdgeType {
  PEDESTRIAN_PATH = 'PEDESTRIAN_PATH',
  PAVED_ROAD = 'PAVED_ROAD',
  COVERED_WALKWAY = 'COVERED_WALKWAY',
  STAIRS = 'STAIRS',
  UNPAVED_TRAIL = 'UNPAVED_TRAIL',
}

@Entity('route_edges')
export class RouteEdge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  sourceNodeId: string;

  @ManyToOne(() => RouteNode, (node) => node.outgoingEdges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sourceNodeId' })
  sourceNode: RouteNode;

  @Index()
  @Column({ type: 'uuid' })
  targetNodeId: string;

  @ManyToOne(() => RouteNode, (node) => node.incomingEdges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'targetNodeId' })
  targetNode: RouteNode;

  @Column({ type: 'double precision' })
  distanceInMeters: number;

  @Column({
    type: 'enum',
    enum: EdgeType,
    default: EdgeType.PEDESTRIAN_PATH,
  })
  edgeType: EdgeType;

  @Column({ type: 'boolean', default: true })
  isAccessibleForWheelchair: boolean;

  @Column({ type: 'boolean', default: true })
  isBiDirectional: boolean;

  @Column({ type: 'boolean', default: true })
  isOpen: boolean;

  @Column({ type: 'jsonb', nullable: true })
  polylineGeometry: Record<string, any>; // GeoJSON LineString coordinates

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
