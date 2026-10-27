import { BadRequestException } from '@nestjs/common';
import { BuiltGraph } from '../interfaces/graph.interface';
import { PathfindingService } from './pathfinding.service';

describe('PathfindingService', () => {
  let service: PathfindingService;

  beforeEach(() => {
    service = new PathfindingService();
  });

  function makeGraph(): BuiltGraph {
    const nodes = new Map(
      ['A', 'B', 'C', 'D', 'E'].map((id) => [
        id,
        { id, name: id, coordinates: [124.26, 8.0] as [number, number] },
      ]),
    );
    const adjacencyList = new Map([
      ['A', [
        { nodeId: 'B', edgeId: 'AB', weight: 5, edgeType: 'PATH' },
        { nodeId: 'C', edgeId: 'AC', weight: 2, edgeType: 'PATH' },
      ]],
      ['B', [
        { nodeId: 'D', edgeId: 'BD', weight: 2, edgeType: 'PATH' },
      ]],
      ['C', [
        { nodeId: 'B', edgeId: 'CB', weight: 1, edgeType: 'PATH' },
        { nodeId: 'D', edgeId: 'CD', weight: 10, edgeType: 'PATH' },
      ]],
      ['D', []],
      ['E', []],
    ]);

    return { nodes, adjacencyList };
  }

  it('returns the minimum-distance route and its edges', () => {
    const result = service.findShortestRoute(makeGraph(), 'A', 'D');

    expect(result).toEqual({
      found: true,
      startNodeId: 'A',
      destinationNodeId: 'D',
      nodeIds: ['A', 'C', 'B', 'D'],
      edges: [
        { nodeId: 'C', edgeId: 'AC', weight: 2, edgeType: 'PATH' },
        { nodeId: 'B', edgeId: 'CB', weight: 1, edgeType: 'PATH' },
        { nodeId: 'D', edgeId: 'BD', weight: 2, edgeType: 'PATH' },
      ],
      coordinates: [[124.26, 8.0]],
      distanceInMeters: 5,
    });
  });

  it('returns an explicit no-route result for disconnected nodes', () => {
    expect(service.findShortestRoute(makeGraph(), 'A', 'E')).toEqual({
      found: false,
      startNodeId: 'A',
      destinationNodeId: 'E',
      reason: 'NO_ROUTE',
    });
  });

  it('returns a zero-distance route when start and destination are the same', () => {
    expect(service.findShortestRoute(makeGraph(), 'A', 'A')).toEqual({
      found: true,
      startNodeId: 'A',
      destinationNodeId: 'A',
      nodeIds: ['A'],
      edges: [],
      coordinates: [[124.26, 8.0]],
      distanceInMeters: 0,
    });
  });

  it('rejects missing, malformed, and unknown location IDs', () => {
    const graph = makeGraph();

    expect(() => service.findShortestRoute(graph, '', 'D')).toThrow(BadRequestException);
    expect(() => service.findShortestRoute(graph, 'A', null)).toThrow(BadRequestException);
    expect(() => service.findShortestRoute(graph, 'unknown', 'D')).toThrow(BadRequestException);
    expect(() => service.findShortestRoute(graph, 'A', 'unknown')).toThrow(BadRequestException);
  });

  it('rejects malformed graph edges instead of crashing or using them', () => {
    const graph = makeGraph();
    graph.adjacencyList.get('A')?.push({
      nodeId: 'missing-node',
      edgeId: 'broken-edge',
      weight: 1,
      edgeType: 'PATH',
    });

    expect(() => service.findShortestRoute(graph, 'A', 'D')).toThrow(BadRequestException);
  });
});
