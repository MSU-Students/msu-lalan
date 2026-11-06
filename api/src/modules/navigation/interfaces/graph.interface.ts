export interface GraphNode {
  id: string;
  name: string;
  acronym?: string;
  category?: string;
  nodeType?: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GraphNeighbor {
  nodeId: string;
  edgeId: string;
  weight: number; // Distansya sa meters
  edgeType: string;
  coordinates?: [number, number][];
  dataQuality?: 'ILLUSTRATIVE' | 'VERIFIED';
}

export type AdjacencyList = Map<string, GraphNeighbor[]>;

export interface BuiltGraph {
  nodes: Map<string, GraphNode>;
  adjacencyList: AdjacencyList;
}