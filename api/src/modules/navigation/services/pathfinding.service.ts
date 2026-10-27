import { BadRequestException, Injectable } from '@nestjs/common';
import { BuiltGraph, GraphNeighbor } from '../interfaces/graph.interface';
import { RouteSolution } from '../interfaces/route-solution.interface';

interface QueueEntry {
  nodeId: string;
  distance: number;
}

class MinPriorityQueue {
  private readonly entries: QueueEntry[] = [];

  get size(): number {
    return this.entries.length;
  }

  enqueue(entry: QueueEntry): void {
    this.entries.push(entry);
    let index = this.entries.length - 1;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.entries[parentIndex].distance <= entry.distance) break;
      this.entries[index] = this.entries[parentIndex];
      index = parentIndex;
    }

    this.entries[index] = entry;
  }

  dequeue(): QueueEntry | undefined {
    if (this.entries.length === 0) return undefined;
    const minimum = this.entries[0];
    const last = this.entries.pop()!;

    if (this.entries.length > 0) {
      let index = 0;
      while (true) {
        const leftIndex = index * 2 + 1;
        const rightIndex = leftIndex + 1;
        if (leftIndex >= this.entries.length) break;

        const smallerChildIndex =
          rightIndex < this.entries.length &&
          this.entries[rightIndex].distance < this.entries[leftIndex].distance
            ? rightIndex
            : leftIndex;
        if (this.entries[smallerChildIndex].distance >= last.distance) break;

        this.entries[index] = this.entries[smallerChildIndex];
        index = smallerChildIndex;
      }

      this.entries[index] = last;
    }

    return minimum;
  }
}

@Injectable()
export class PathfindingService {
  findShortestRoute(
    graph: BuiltGraph,
    startNodeId: unknown,
    destinationNodeId: unknown,
  ): RouteSolution {
    if (typeof startNodeId !== 'string' || startNodeId.trim().length === 0) {
      throw new BadRequestException('startNodeId must be a non-empty string.');
    }
    if (typeof destinationNodeId !== 'string' || destinationNodeId.trim().length === 0) {
      throw new BadRequestException('destinationNodeId must be a non-empty string.');
    }
    this.validateGraph(graph);

    if (!graph.nodes.has(startNodeId)) {
      throw new BadRequestException(`Unknown start node '${startNodeId}'.`);
    }
    if (!graph.nodes.has(destinationNodeId)) {
      throw new BadRequestException(`Unknown destination node '${destinationNodeId}'.`);
    }

    if (startNodeId === destinationNodeId) {
      return {
        found: true,
        startNodeId,
        destinationNodeId,
        nodeIds: [startNodeId],
        edges: [],
        coordinates: [graph.nodes.get(startNodeId)!.coordinates],
        distanceInMeters: 0,
        dataQuality: 'VERIFIED',
      };
    }

    const distances = new Map<string, number>([[startNodeId, 0]]);
    const previous = new Map<string, { nodeId: string; edge: GraphNeighbor }>();
    const queue = new MinPriorityQueue();
    queue.enqueue({ nodeId: startNodeId, distance: 0 });

    while (queue.size > 0) {
      const current = queue.dequeue()!;
      if (current.distance > (distances.get(current.nodeId) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }
      if (current.nodeId === destinationNodeId) break;

      for (const edge of graph.adjacencyList.get(current.nodeId) ?? []) {
        const candidateDistance = current.distance + edge.weight;
        if (candidateDistance >= (distances.get(edge.nodeId) ?? Number.POSITIVE_INFINITY)) {
          continue;
        }

        distances.set(edge.nodeId, candidateDistance);
        previous.set(edge.nodeId, { nodeId: current.nodeId, edge });
        queue.enqueue({ nodeId: edge.nodeId, distance: candidateDistance });
      }
    }

    const distanceInMeters = distances.get(destinationNodeId);
    if (distanceInMeters === undefined) {
      return {
        found: false,
        startNodeId,
        destinationNodeId,
        reason: 'NO_ROUTE',
      };
    }

    const nodeIds = [destinationNodeId];
    const edges: GraphNeighbor[] = [];
    let currentNodeId = destinationNodeId;

    while (currentNodeId !== startNodeId) {
      const step = previous.get(currentNodeId);
      if (!step) {
        throw new BadRequestException('The graph contains an incomplete route predecessor chain.');
      }
      edges.push(step.edge);
      currentNodeId = step.nodeId;
      nodeIds.push(currentNodeId);
    }

    nodeIds.reverse();
    edges.reverse();
    const coordinates: [number, number][] = [];
    for (let index = 0; index < edges.length; index++) {
      const edgeCoordinates = edges[index].coordinates ?? [
        graph.nodes.get(nodeIds[index])!.coordinates,
        graph.nodes.get(nodeIds[index + 1])!.coordinates,
      ];
      coordinates.push(...(coordinates.length > 0 ? edgeCoordinates.slice(1) : edgeCoordinates));
    }
    if (coordinates.length === 0) {
      coordinates.push(graph.nodes.get(startNodeId)!.coordinates);
    }

    return {
      found: true,
      startNodeId,
      destinationNodeId,
      nodeIds,
      edges,
      coordinates,
      distanceInMeters,
      dataQuality: edges.some((edge) => edge.dataQuality === 'ILLUSTRATIVE')
        ? 'ILLUSTRATIVE'
        : 'VERIFIED',
    };
  }

  private validateGraph(graph: BuiltGraph): void {
    if (
      !graph ||
      !(graph.nodes instanceof Map) ||
      !(graph.adjacencyList instanceof Map)
    ) {
      throw new BadRequestException('A valid built graph is required.');
    }

    for (const [nodeId, node] of graph.nodes) {
      if (
        typeof nodeId !== 'string' ||
        nodeId.trim().length === 0 ||
        !node ||
        node.id !== nodeId
      ) {
        throw new BadRequestException('The graph contains an invalid node.');
      }
      if (!graph.adjacencyList.has(nodeId) || !Array.isArray(graph.adjacencyList.get(nodeId))) {
        throw new BadRequestException(`The graph has no adjacency list for node '${nodeId}'.`);
      }
    }

    for (const [nodeId, edges] of graph.adjacencyList) {
      if (!graph.nodes.has(nodeId) || !Array.isArray(edges)) {
        throw new BadRequestException(`The graph contains an invalid adjacency list for node '${nodeId}'.`);
      }

      for (const edge of edges) {
        if (
          !edge ||
          typeof edge.nodeId !== 'string' ||
          !graph.nodes.has(edge.nodeId) ||
          typeof edge.edgeId !== 'string' ||
          edge.edgeId.trim().length === 0 ||
          typeof edge.weight !== 'number' ||
          !Number.isFinite(edge.weight) ||
          edge.weight <= 0 ||
          typeof edge.edgeType !== 'string' ||
          edge.edgeType.trim().length === 0
        ) {
          throw new BadRequestException(`The graph contains an invalid edge from node '${nodeId}'.`);
        }
      }
    }
  }
}
