import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { RouteEdge } from './route-edge.entity';

export enum NodeType {
  INTERSECTION = 'INTERSECTION',
  BUILDING_ENTRANCE = 'BUILDING_ENTRANCE',
  LANDMARK = 'LANDMARK',
  WALKWAY_POINT = 'WALKWAY_POINT',
  ROAD_JUNCTION = 'ROAD_JUNCTION',
}

@Entity('route_nodes')
export class RouteNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Index()
  @Column({ type: 'double precision' })
  latitude: number;

  @Index()
  @Column({ type: 'double precision' })
  longitude: number;

  @Column({ type: 'double precision', default: 0 })
  elevation: number;

  @Column({
    type: 'enum',
    enum: NodeType,
    default: NodeType.WALKWAY_POINT,
  })
  nodeType: NodeType;

  @OneToMany(() => RouteEdge, (edge) => edge.sourceNode)
  outgoingEdges: RouteEdge[];

  @OneToMany(() => RouteEdge, (edge) => edge.targetNode)
  incomingEdges: RouteEdge[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
