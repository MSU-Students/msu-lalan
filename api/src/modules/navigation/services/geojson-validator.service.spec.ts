import { GeoJsonValidatorService } from './geojson-validator.service';
import { CampusGraphGeoJsonDto } from '../dto/geojson-graph.dto';

describe('GeoJsonValidatorService', () => {
  let validatorService: GeoJsonValidatorService;

  beforeEach(() => {
    validatorService = new GeoJsonValidatorService();
  });

  it('dapat ma-validate nang maayos ang valid na campus GeoJSON data', () => {
    const validGeoJson: CampusGraphGeoJsonDto = {
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

    const result = validatorService.validateGraph(validGeoJson);

    expect(result.isValid).toBe(true);
    expect(result.nodesCount).toBe(2);
    expect(result.edgesCount).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('dapat mag-flag ng error kapag may tumutukoy sa hindi umiiral na target node', () => {
    const invalidGeoJson: any = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [124.2621, 8.0035] },
          properties: { id: 'node-agora', name: 'Agora', nodeType: 'LANDMARK' },
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
            id: 'edge-broken',
            sourceNodeId: 'node-agora',
            targetNodeId: 'node-missing', // Walang ganitong node
            distanceInMeters: 100,
            edgeType: 'PAVED_ROAD',
          },
        },
      ],
    };

    const result = validatorService.validateGraph(invalidGeoJson);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((err) => err.includes("Target node 'node-missing' does not exist"))).toBe(true);
  });

  it('validates edges even when they appear before their node features', () => {
    const result = validatorService.validateGraph({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[124.2621, 8.0035], [124.2635, 8.0042]] },
          properties: {
            id: 'edge-agora-cics',
            sourceNodeId: 'node-agora',
            targetNodeId: 'node-cics',
            distanceInMeters: 175.4,
            edgeType: 'COVERED_WALKWAY',
          },
        },
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
      ],
    });

    expect(result.isValid).toBe(true);
    expect(result.connectedComponentsCount).toBe(1);
  });

  it('rejects malformed features, non-finite coordinates, and incomplete node properties', () => {
    const result = validatorService.validateGraph({
      type: 'FeatureCollection',
      features: [
        null,
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [Number.NaN, 8.0035] },
          properties: { id: 'node-invalid', name: '', nodeType: 'LANDMARK' },
        },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Must be a GeoJSON Feature object'),
        expect.stringContaining('valid [longitude, latitude] pair'),
        expect.stringContaining('non-empty name and nodeType'),
      ]),
    );
  });

  it('reports isolated nodes and disconnected components as warnings', () => {
    const result = validatorService.validateGraph({
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
          properties: { id: 'node-isolated', name: 'Isolated', nodeType: 'LANDMARK' },
        },
      ],
    });

    expect(result.isValid).toBe(true);
    expect(result.connectedComponentsCount).toBe(2);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('2 disconnected components'),
        expect.stringContaining("Node 'node-agora' is isolated"),
        expect.stringContaining("Node 'node-isolated' is isolated"),
      ]),
    );
  });

  it('rejects malformed edge coordinates and non-positive or non-finite weights', () => {
    const result = validatorService.validateGraph({
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
            coordinates: [[124.2621, 8.0035], [181, 8.0042]],
          },
          properties: {
            id: 'edge-invalid',
            sourceNodeId: 'node-agora',
            targetNodeId: 'node-cics',
            distanceInMeters: Number.POSITIVE_INFINITY,
            edgeType: 'PAVED_ROAD',
          },
        },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('positive finite number'),
        expect.stringContaining('valid [longitude, latitude] pair'),
      ]),
    );
  });
});