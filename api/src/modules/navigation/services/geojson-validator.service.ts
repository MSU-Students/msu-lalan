import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CampusGraphGeoJsonDto } from '../dto/geojson-graph.dto';

export interface ValidationResult {
  isValid: boolean;
  nodesCount: number;
  edgesCount: number;
  polygonsCount: number;
  warnings: string[];
  errors: string[];
}

@Injectable()
export class GeoJsonValidatorService {
  private readonly logger = new Logger(GeoJsonValidatorService.name);

  validateGraph(geoJson: CampusGraphGeoJsonDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    const connectedNodeIds = new Set<string>();

    let nodesCount = 0;
    let edgesCount = 0;
    let polygonsCount = 0;

    if (!geoJson || geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
      throw new BadRequestException('Invalid GeoJSON format: Must be a FeatureCollection with features array.');
    }

    // Pass 1: Suriin at ipunin ang mga Nodes
    for (const [index, feature] of geoJson.features.entries()) {
      const geomType = feature.geometry?.type;

      if (geomType === 'Point') {
        nodesCount++;
        const props = feature.properties;
        const coords = feature.geometry.coordinates;

        if (!props?.id) {
          errors.push(`Feature[${index}] (Node): Missing 'id' in properties.`);
        } else if (nodeIds.has(props.id)) {
          errors.push(`Feature[${index}] (Node): Duplicate Node ID '${props.id}'.`);
        } else {
          nodeIds.add(props.id);
        }

        if (!Array.isArray(coords) || coords.length !== 2) {
          errors.push(`Feature[${index}] (Node '${props?.id}'): Coordinates must be [longitude, latitude].`);
        } else {
          const [lng, lat] = coords;
          if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            errors.push(`Feature[${index}] (Node '${props?.id}'): Coordinates out of valid range.`);
          }
        }
      } else if (geomType === 'Polygon') {
        polygonsCount++;
      }
    }

    // Pass 2: Suriin ang mga Edges at mga koneksyon nito sa Nodes
    for (const [index, feature] of geoJson.features.entries()) {
      if (feature.geometry?.type === 'LineString') {
        edgesCount++;
        const props = feature.properties;
        const coords = feature.geometry.coordinates;

        if (!props?.id) {
          errors.push(`Feature[${index}] (Edge): Missing 'id' in properties.`);
        } else if (edgeIds.has(props.id)) {
          errors.push(`Feature[${index}] (Edge): Duplicate Edge ID '${props.id}'.`);
        } else {
          edgeIds.add(props.id);
        }

        // Suriin ang sourceNodeId at targetNodeId
        const sourceId = props?.sourceNodeId;
        const targetId = props?.targetNodeId;

        if (!sourceId) {
          errors.push(`Feature[${index}] (Edge '${props?.id}'): Missing 'sourceNodeId'.`);
        } else if (!nodeIds.has(sourceId)) {
          errors.push(`Feature[${index}] (Edge '${props?.id}'): Source node '${sourceId}' does not exist.`);
        } else {
          connectedNodeIds.add(sourceId);
        }

        if (!targetId) {
          errors.push(`Feature[${index}] (Edge '${props?.id}'): Missing 'targetNodeId'.`);
        } else if (!nodeIds.has(targetId)) {
          errors.push(`Feature[${index}] (Edge '${props?.id}'): Target node '${targetId}' does not exist.`);
        } else {
          connectedNodeIds.add(targetId);
        }

        // Suriin ang distanceInMeters
        if (typeof props?.distanceInMeters !== 'number' || props.distanceInMeters <= 0) {
          errors.push(`Feature[${index}] (Edge '${props?.id}'): 'distanceInMeters' must be a positive number.`);
        }

        if (!Array.isArray(coords) || coords.length < 2) {
          errors.push(`Feature[${index}] (Edge '${props?.id}'): LineString must have at least 2 coordinate points.`);
        }
      }
    }

    // Pass 3: Siyasatin ang mga Isolated (Unconnected) Nodes
    for (const nodeId of nodeIds) {
      if (!connectedNodeIds.has(nodeId)) {
        warnings.push(`Node '${nodeId}' is isolated (has no connecting edges).`);
      }
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn(`Campus GeoJSON validation failed with ${errors.length} errors.`);
    } else {
      this.logger.log(`Campus GeoJSON validated: ${nodesCount} nodes, ${edgesCount} edges, ${polygonsCount} polygons.`);
    }

    return { isValid, nodesCount, edgesCount, polygonsCount, warnings, errors };
  }
}