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
      ['A', 'B', 'C', 'D', 'E'].map((id, index) => [
        id,
        { id, name: id, coordinates: [124.26 + index * 0.001, 8 + index * 0.001] as [number, number] },
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
      coordinates: [
        [124.26, 8],
        [124.262, 8.002],
        [124.26100000000001, 8.001],
        [124.263, 8.003],
      ],
      distanceInMeters: 5,
      dataQuality: 'VERIFIED',
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

  it('marks a route illustrative if any route edge uses illustrative data', () => {
    const graph = makeGraph();
    const edge = graph.adjacencyList.get('C')?.find((neighbor) => neighbor.edgeId === 'CB');
    if (edge) edge.dataQuality = 'ILLUSTRATIVE';

    const result = service.findShortestRoute(graph, 'A', 'D');
    expect(result.found).toBe(true);
    if (result.found) expect(result.dataQuality).toBe('ILLUSTRATIVE');
  });

  it('returns a zero-distance route when start and destination are the same', () => {
    expect(service.findShortestRoute(makeGraph(), 'A', 'A')).toEqual({
      found: true,
      startNodeId: 'A',
      destinationNodeId: 'A',
      nodeIds: ['A'],
      edges: [],
      coordinates: [[124.26, 8]],
      distanceInMeters: 0,
      dataQuality: 'VERIFIED',
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
