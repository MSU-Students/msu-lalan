import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { GeoJsonValidatorService } from './geojson-validator.service';
import { CampusGraphGeoJsonDto } from '../dto/geojson-graph.dto';
import { BuiltGraph, GraphNode, AdjacencyList } from '../interfaces/graph.interface';

@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);

  constructor(private readonly validatorService: GeoJsonValidatorService) {}

  buildGraphFromGeoJson(geoJson: CampusGraphGeoJsonDto): BuiltGraph {
    // 1. I-validate muna ang GeoJSON structure
    const validation = this.validatorService.validateGraph(geoJson);
    if (!validation.isValid) {
      this.logger.error('Cannot build graph: Provided GeoJSON contains errors.');
      throw new BadRequestException({
        message: 'Invalid GeoJSON campus network data.',
        errors: validation.errors,
      });
    }

    const nodes = new Map<string, GraphNode>();
    const adjacencyList: AdjacencyList = new Map();

    // 2. Pass 1: Kunin ang lahat ng Point features (Nodes) at i-initialize ang Adjacency List
    for (const feature of geoJson.features) {
      if (feature.geometry?.type === 'Point') {
        const { id, name, nodeType } = feature.properties;
        const coordinates = feature.geometry.coordinates as [number, number];

        nodes.set(id, { id, name, nodeType, coordinates });
        adjacencyList.set(id, []); // Simulan bilang empty array
      }
    }

    // 3. Pass 2: I-populate ang Adjacency List gamit ang LineString features (Edges)
    for (const feature of geoJson.features) {
      if (feature.geometry?.type === 'LineString') {
        const { id, sourceNodeId, targetNodeId, distanceInMeters, edgeType, isBiDirectional = true } = feature.properties;

        // Isama ang koneksyon mula Source papuntang Target
        this.addNeighbor(adjacencyList, sourceNodeId, {
          nodeId: targetNodeId,
          edgeId: id,
          weight: distanceInMeters,
          edgeType,
        });

        // Kapag bidirectional (pwedeng balikan), isama rin ang Target papuntang Source
        if (isBiDirectional) {
          this.addNeighbor(adjacencyList, targetNodeId, {
            nodeId: sourceNodeId,
            edgeId: id,
            weight: distanceInMeters,
            edgeType,
          });
        }
      }
    }

    this.logger.log(`Graph successfully built in-memory: ${nodes.size} nodes processed.`);
    return { nodes, adjacencyList };
  }

  private addNeighbor(adjList: AdjacencyList, fromNodeId: string, neighbor: any) {
    const neighbors = adjList.get(fromNodeId);
    if (neighbors) {
      neighbors.push(neighbor);
    }
  }
}