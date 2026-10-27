import { GraphBuilderService } from './graph-builder.service';
import { GeoJsonValidatorService } from './geojson-validator.service';

describe('GraphBuilderService', () => {
  let builderService: GraphBuilderService;

  beforeEach(() => {
    const validatorService = new GeoJsonValidatorService();
    builderService = new GraphBuilderService(validatorService);
  });

  it('dapat makabuo ng Adjacency List na may parehong pabalik at papuntang koneksyon kapag bidirectional', () => {
    const mockGeoJson: any = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [124.2621, 8.0035] },
          properties: { id: 'node-agora', name: 'Agora', nodeType: 'LANDMARK' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [124.2635, 8.0042] },
          properties: { id: 'node-cics', name: 'CICS', nodeType: 'BUILDING_ENTRANCE' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [124.2621, 8.0035],
              [124.2635, 8.0042],
            ],
          },
          properties: {
            id: 'edge-agora-cics',
            sourceNodeId: 'node-agora',
            targetNodeId: 'node-cics',
            distanceInMeters: 175.4,
            edgeType: 'COVERED_WALKWAY',
            isBiDirectional: true,
          },
        },
      ],
    };

    const graph = builderService.buildGraphFromGeoJson(mockGeoJson);

    // Suriin ang Nodes
    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.get('node-agora')?.name).toBe('Agora');

    // Suriin ang koneksyong Agora -> CICS
    const agoraNeighbors = graph.adjacencyList.get('node-agora');
    expect(agoraNeighbors).toHaveLength(1);
    expect(agoraNeighbors?.[0].nodeId).toBe('node-cics');
    expect(agoraNeighbors?.[0].weight).toBe(175.4);

    // Suriin ang reverse connection (CICS -> Agora) dahil isBiDirectional = true
    const cicsNeighbors = graph.adjacencyList.get('node-cics');
    expect(cicsNeighbors).toHaveLength(1);
    expect(cicsNeighbors?.[0].nodeId).toBe('node-agora');
  });
});