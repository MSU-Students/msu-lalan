import { GraphNeighbor } from './graph.interface';

export interface FoundRoute {
  found: true;
  startNodeId: string;
  destinationNodeId: string;
  nodeIds: string[];
  edges: GraphNeighbor[];
  coordinates: [number, number][];
  distanceInMeters: number;
  dataQuality: 'ILLUSTRATIVE' | 'VERIFIED';
}

export interface NoRoute {
  found: false;
  startNodeId: string;
  destinationNodeId: string;
  reason: 'NO_ROUTE';
}

export type RouteSolution = FoundRoute | NoRoute;
