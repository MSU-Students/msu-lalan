import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FindRouteDto } from '../dto/find-route.dto';
import { GraphNode } from '../interfaces/graph.interface';
import { FoundRoute, NoRoute } from '../interfaces/route-solution.interface';
import { GraphBuilderService } from './graph-builder.service';
import { PathfindingService } from './pathfinding.service';

const MAX_SNAP_DISTANCE_METERS = 500;
const EARTH_RADIUS_METERS = 6_371_000;
const WALKING_SPEED_METERS_PER_MINUTE = 75;
const MOTORCYCLE_SPEED_METERS_PER_MINUTE = 250;
const RACAL_SPEED_METERS_PER_MINUTE = 200;
const ESTIMATED_ROAD_DETOUR_FACTOR = 1.4;

export interface CampusRoute extends FoundRoute {
  snapStartNode: Pick<GraphNode, 'id' | 'name' | 'coordinates'>;
  snapDistanceInMeters: number;
  startConnectorCoordinates: [number, number][];
  travelTimeEstimates: {
    walkingMinutes: number;
    motorcycleMinutes: number;
    racalMinutes: number;
    estimatedRoadDistanceInMeters: number;
  };
}

export interface StartTooFar {
  found: false;
  reason: 'START_TOO_FAR';
  nearestNodeId: string;
  snapDistanceInMeters: number;
}

function distanceBetweenCoordinates(
  first: [number, number],
  second: [number, number],
): number {
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const [firstLongitude, firstLatitude] = first;
  const [secondLongitude, secondLatitude] = second;
  const latitudeDelta = toRadians(secondLatitude - firstLatitude);
  const longitudeDelta = toRadians(secondLongitude - firstLongitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(firstLatitude)) *
      Math.cos(toRadians(secondLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

@Injectable()
export class CampusNavigationService implements OnModuleInit {
  private readonly logger = new Logger(CampusNavigationService.name);
  private graph: ReturnType<GraphBuilderService['buildGraphFromGeoJson']>;

  constructor(
    private readonly graphBuilder: GraphBuilderService,
    private readonly pathfinding: PathfindingService,
  ) {}

  onModuleInit(): void {
    const graphPath = [
      join(__dirname, '../../../data/geojson/campus-network-sample.geojson'),
      join(__dirname, '../../../../data/geojson/campus-network-sample.geojson'),
    ].find(existsSync);
    if (!graphPath) {
      throw new Error('Unable to locate the bundled campus walking graph GeoJSON asset.');
    }

    let graphData: unknown;

    try {
      graphData = JSON.parse(readFileSync(graphPath, 'utf8'));
    } catch (error) {
      this.logger.error(`Unable to load campus walking graph from ${graphPath}.`, error);
      throw error;
    }

    this.graph = this.graphBuilder.buildGraphFromGeoJson(graphData);
  }

  getLocations() {
    this.ensureGraphLoaded();
    return [...this.graph.nodes.values()].map((node) => ({
      id: node.id,
      name: node.name,
      nodeType: node.nodeType,
      coordinates: node.coordinates,
      hasOutgoingRoute: (this.graph.adjacencyList.get(node.id)?.length ?? 0) > 0,
    }));
  }

  findRoute(request: FindRouteDto): CampusRoute | NoRoute | StartTooFar {
    this.ensureGraphLoaded();
    this.validateCoordinates(request.startLatitude, request.startLongitude);

    const startCoordinates: [number, number] = [request.startLongitude, request.startLatitude];
    const nearestNode = this.findNearestConnectedNode(startCoordinates);
    if (!nearestNode) {
      throw new BadRequestException('The campus graph does not contain any connected route nodes.');
    }

    const snapDistanceInMeters = distanceBetweenCoordinates(
      startCoordinates,
      nearestNode.coordinates,
    );
    if (snapDistanceInMeters > MAX_SNAP_DISTANCE_METERS) {
      return {
        found: false,
        reason: 'START_TOO_FAR',
        nearestNodeId: nearestNode.id,
        snapDistanceInMeters,
      };
    }

    const route = this.pathfinding.findShortestRoute(
      this.graph,
      nearestNode.id,
      request.destinationNodeId,
    );
    if (!route.found) {
      return {
        found: false,
        startNodeId: route.startNodeId,
        destinationNodeId: route.destinationNodeId,
        reason: 'NO_ROUTE',
      };
    }
    const directDistanceToDestination = distanceBetweenCoordinates(
      startCoordinates,
      this.graph.nodes.get(request.destinationNodeId)!.coordinates,
    );
    const estimatedRoadDistanceInMeters = directDistanceToDestination * ESTIMATED_ROAD_DETOUR_FACTOR;

    return {
      ...route,
      snapStartNode: {
        id: nearestNode.id,
        name: nearestNode.name,
        coordinates: nearestNode.coordinates,
      },
      snapDistanceInMeters,
      startConnectorCoordinates: [startCoordinates, nearestNode.coordinates],
      travelTimeEstimates: {
        walkingMinutes: Math.max(
          1,
          Math.ceil(
            (route.distanceInMeters + snapDistanceInMeters) / WALKING_SPEED_METERS_PER_MINUTE,
          ),
        ),
        motorcycleMinutes: Math.max(
          1,
          Math.ceil(estimatedRoadDistanceInMeters / MOTORCYCLE_SPEED_METERS_PER_MINUTE),
        ),
        racalMinutes: Math.max(1, Math.ceil(estimatedRoadDistanceInMeters / RACAL_SPEED_METERS_PER_MINUTE)),
        estimatedRoadDistanceInMeters,
      },
    };
  }

  private findNearestConnectedNode(coordinates: [number, number]): GraphNode | undefined {
    let nearest: GraphNode | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const node of this.graph.nodes.values()) {
      if ((this.graph.adjacencyList.get(node.id)?.length ?? 0) === 0) continue;
      const distance = distanceBetweenCoordinates(coordinates, node.coordinates);
      if (distance < nearestDistance) {
        nearest = node;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private validateCoordinates(latitude: number, longitude: number): void {
    if (
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new BadRequestException('startLatitude must be a valid latitude.');
    }
    if (
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException('startLongitude must be a valid longitude.');
    }
  }

  private ensureGraphLoaded(): void {
    if (!this.graph) {
      throw new BadRequestException('The campus walking graph is not loaded.');
    }
  }
}
