import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteNode } from './entities/route-node.entity'; // i-adjust ang import path kung kinakailangan
import { RouteEdge } from './entities/route-edge.entity'; // i-adjust ang import path kung kinakailangan

// Enum ng mga walkable edge types batay sa verification rules[cite: 6]
const WALKABLE_EDGE_TYPES = [
  'COVERED_WALKWAY',
  'PAVED_ROAD',
  'PEDESTRIAN_PATH',
  'STAIRS',
  'UNPAVED_TRAIL',
];

@Injectable()
export class NavigationService {
  constructor(
    @InjectRepository(RouteNode)
    private readonly nodeRepository: Repository<RouteNode>,
    @InjectRepository(RouteEdge)
    private readonly edgeRepository: Repository<RouteEdge>,
  ) {}

  async findShortestPath(startNodeId: string, endNodeId: string) {
    // 1. Existence Check: Siguraduhing umiiral ang start at destination nodes sa database[cite: 6]
    const startNode = await this.nodeRepository.findOne({ where: { id: startNodeId } });
    const endNode = await this.nodeRepository.findOne({ where: { id: endNodeId } });

    if (!startNode || !endNode) {
      throw new NotFoundException('Start or destination node not found in database.');
    }

    // 2. Kunin ang lahat ng nodes at edges mula sa database[cite: 6]
    const allNodes = await this.nodeRepository.find();
    const allEdges = await this.edgeRepository.find();

    // 3. Edge Filtering Rules[cite: 6]:
    // - Dapat isOpen = true[cite: 6]
    // - Dapat walkable edgeType[cite: 6]
    const validEdges = allEdges.filter(
      (edge) => edge.isOpen && WALKABLE_EDGE_TYPES.includes(edge.edgeType),
    );

    // 4. Bumuo ng Adjacency Graph para sa Dijkstra Algorithm
    const graph: Map<string, { node: string; weight: number }[]> = new Map();

    allNodes.forEach((node) => graph.set(node.id, []));

    validEdges.forEach((edge) => {
      const weight = Number(edge.distanceInMeters); // Cost Metric: distanceInMeters[cite: 6]

      // A. Mula source patungong target (Laging allowed)[cite: 6]
      graph.get(edge.sourceNodeId)?.push({ node: edge.targetNodeId, weight });

      // B. Directionality Check: Kung isBiDirectional = true, pwede ring bumalik[cite: 6]
      if (edge.isBiDirectional) {
        graph.get(edge.targetNodeId)?.push({ node: edge.sourceNodeId, weight });
      }
    });

    // 5. Dijkstra's Pathfinding Logic Implementation
    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const unvisited: Set<string> = new Set();

    allNodes.forEach((node) => {
      distances.set(node.id, Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    });

    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      // Hanapin ang unvisited node na may pinakamababang distansya
      let currentSmallestNode: string | null = null;
      let smallestDistance = Infinity;

      unvisited.forEach((nodeId) => {
        const dist = distances.get(nodeId)!;
        if (dist < smallestDistance) {
          smallestDistance = dist;
          currentSmallestNode = nodeId;
        }
      });

      if (!currentSmallestNode || smallestDistance === Infinity) {
        break; // Walang mahanap na koneksyon o napuntahan na ang lahat
      }

      if (currentSmallestNode === endNodeId) {
        break; // Nakarating na sa dulo
      }

      unvisited.delete(currentSmallestNode);

      // Suriin ang mga kapitbahay (neighbors) ng kasalukuyang node
      const neighbors = graph.get(currentSmallestNode) || [];
      for (const neighbor of neighbors) {
        if (unvisited.has(neighbor.node)) {
          const altDistance = distances.get(currentSmallestNode)! + neighbor.weight;

          if (altDistance < distances.get(neighbor.node)!) {
            distances.set(neighbor.node, altDistance);
            previous.set(neighbor.node, currentSmallestNode);
          }
        }
      }
    }

    // 6. I-reconstruct ang Nabuong Ruta (Path Reconstruction)
    const path: string[] = [];
    let curr: string | null = endNodeId;

    while (curr) {
      path.unshift(curr);
      curr = previous.get(curr) || null;
    }

    // Kung hindi man lang umabot ang ruta mula startNodeId, walang path na nahanap
    if (path[0] !== startNodeId) {
      throw new NotFoundException('No valid path available between the selected locations.');
    }

    return {
      totalDistanceInMeters: distances.get(endNodeId),
      pathNodeIds: path,
    };
  }
}