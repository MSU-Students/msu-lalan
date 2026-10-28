import { BadRequestException } from '@nestjs/common';
import { GraphBuilderService } from './graph-builder.service';
import { GeoJsonValidatorService } from './geojson-validator.service';
import { PathfindingService } from './pathfinding.service';
import { CampusNavigationService } from './campus-navigation.service';

describe('CampusNavigationService', () => {
  let service: CampusNavigationService;

  beforeEach(() => {
    service = new CampusNavigationService(
      new GraphBuilderService(new GeoJsonValidatorService()),
      new PathfindingService(),
    );
    service.onModuleInit();
  });

  it('loads graph locations and routes between connected campus nodes', () => {
    const locations = service.getLocations();
    expect(locations).toHaveLength(6);

    const route = service.findRoute({
      startLatitude: 8.0035,
      startLongitude: 124.2621,
      destinationNodeId: 'node-cics',
    });

    expect(route.found).toBe(true);
    if (!route.found) return;
    expect(route.nodeIds).toEqual(['node-agora', 'node-cics']);
    expect(route.distanceInMeters).toBe(175.4);
    expect(route.dataQuality).toBe('ILLUSTRATIVE');
    expect(route.coordinates).toEqual([
      [124.2621, 8.0035],
      [124.2620, 8.0038],
      [124.2624, 8.0040],
      [124.2629, 8.0040],
      [124.2631, 8.0042],
      [124.2635, 8.0042],
    ]);
  });

  it('routes from the Bolawan Hall demo pin to CICS with clearly illustrative path data', () => {
    const route = service.findRoute({
      startLatitude: 7.9950528,
      startLongitude: 124.2616116,
      destinationNodeId: 'node-cics',
    });

    expect(route.found).toBe(true);
    if (!route.found) return;
    expect(route.nodeIds).toEqual(['node-bolawan-hall', 'node-agora', 'node-cics']);
    expect(route.dataQuality).toBe('ILLUSTRATIVE');
    expect(route.distanceInMeters).toBe(1225.4);
    expect(route.travelTimeEstimates).toMatchObject({
      walkingMinutes: 17,
      motorcycleMinutes: expect.any(Number),
      racalMinutes: expect.any(Number),
    });
    expect(route.travelTimeEstimates.motorcycleMinutes).toBeGreaterThan(0);
    expect(route.travelTimeEstimates.racalMinutes).toBeGreaterThan(0);
  });

  it('returns no route for a destination not connected in the sample graph', () => {
    const route = service.findRoute({
      startLatitude: 8.0035,
      startLongitude: 124.2621,
      destinationNodeId: 'node-dimaporo-gym',
    });

    expect(route).toEqual({
      found: false,
      startNodeId: 'node-agora',
      destinationNodeId: 'node-dimaporo-gym',
      reason: 'NO_ROUTE',
    });
  });

  it('reports a start location too far from the sample network', () => {
    expect(service.findRoute({
      startLatitude: 8.01,
      startLongitude: 124.27,
      destinationNodeId: 'node-cics',
    })).toMatchObject({
      found: false,
      reason: 'START_TOO_FAR',
    });
  });

  it('rejects invalid coordinates and unknown destinations', () => {
    expect(() => service.findRoute({
      startLatitude: 91,
      startLongitude: 124.2621,
      destinationNodeId: 'node-cics',
    })).toThrow(BadRequestException);
    expect(() => service.findRoute({
      startLatitude: 8.0035,
      startLongitude: 124.2621,
      destinationNodeId: 'not-a-location',
    })).toThrow(BadRequestException);
  });
});
