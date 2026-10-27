import { Injectable, Logger } from '@nestjs/common';
import { Position } from '../dto/geojson-graph.dto';

export interface ValidationResult {
  isValid: boolean;
  nodesCount: number;
  edgesCount: number;
  polygonsCount: number;
  connectedComponentsCount: number;
  warnings: string[];
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPosition(value: unknown): value is Position {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [longitude, latitude] = value;
  return (
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
  );
}

@Injectable()
export class GeoJsonValidatorService {
  private readonly logger = new Logger(GeoJsonValidatorService.name);

  validateGraph(input: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    const graph = new Map<string, Set<string>>();

    let nodesCount = 0;
    let edgesCount = 0;
    let polygonsCount = 0;

    if (!isRecord(input) || input.type !== 'FeatureCollection' || !Array.isArray(input.features)) {
      errors.push('Invalid GeoJSON format: Must be a FeatureCollection with a features array.');
      return this.result(errors, warnings, nodesCount, edgesCount, polygonsCount, 0);
    }

    for (const [index, feature] of input.features.entries()) {
      if (!isRecord(feature) || !isRecord(feature.geometry) || feature.geometry.type !== 'Point') continue;

      const properties = feature.properties;
      const nodeId = isRecord(properties) ? properties.id : undefined;
      if (!isNonEmptyString(nodeId)) {
        errors.push(`Feature[${index}] (Node): properties.id must be a non-empty string.`);
      } else if (nodeIds.has(nodeId)) {
        errors.push(`Feature[${index}] (Node): Duplicate Node ID '${nodeId}'.`);
      } else {
        nodeIds.add(nodeId);
        graph.set(nodeId, new Set());
      }
    }

    for (const [index, feature] of input.features.entries()) {
      if (!isRecord(feature)) {
        errors.push(`Feature[${index}]: Must be a GeoJSON Feature object.`);
        continue;
      }

      if (feature.type !== 'Feature') {
        errors.push(`Feature[${index}]: type must be 'Feature'.`);
      }

      const geometry = feature.geometry;
      if (!isRecord(geometry)) {
        errors.push(`Feature[${index}]: geometry must be an object.`);
        continue;
      }

      if (geometry.type === 'Point') {
        nodesCount++;
        const properties = feature.properties;
        const nodeId = isRecord(properties) ? properties.id : undefined;

        if (
          !isRecord(properties) ||
          !isNonEmptyString(properties.name) ||
          !isNonEmptyString(properties.nodeType)
        ) {
          errors.push(`Feature[${index}] (Node): properties must include non-empty name and nodeType strings.`);
        }

        if (!isPosition(geometry.coordinates)) {
          errors.push(
            `Feature[${index}] (Node '${String(nodeId ?? 'unknown')}'): coordinates must be a valid [longitude, latitude] pair.`,
          );
        }
      } else if (geometry.type === 'LineString') {
        edgesCount++;
        const properties = feature.properties;
        const edgeId = isRecord(properties) ? properties.id : undefined;
        const sourceId = isRecord(properties) ? properties.sourceNodeId : undefined;
        const targetId = isRecord(properties) ? properties.targetNodeId : undefined;
        const coordinates = geometry.coordinates;

        if (!isNonEmptyString(edgeId)) {
          errors.push(`Feature[${index}] (Edge): properties.id must be a non-empty string.`);
        } else if (edgeIds.has(edgeId)) {
          errors.push(`Feature[${index}] (Edge): Duplicate Edge ID '${edgeId}'.`);
        } else {
          edgeIds.add(edgeId);
        }

        if (!isNonEmptyString(sourceId)) {
          errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): sourceNodeId must be a non-empty string.`);
        } else if (!nodeIds.has(sourceId)) {
          errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): Source node '${sourceId}' does not exist.`);
        }

        if (!isNonEmptyString(targetId)) {
          errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): targetNodeId must be a non-empty string.`);
        } else if (!nodeIds.has(targetId)) {
          errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): Target node '${targetId}' does not exist.`);
        }

        if (isRecord(properties)) {
          if (!isNonEmptyString(properties.edgeType)) {
            errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): edgeType must be a non-empty string.`);
          }
          if (
            properties.dataQuality !== undefined &&
            properties.dataQuality !== 'ILLUSTRATIVE' &&
            properties.dataQuality !== 'VERIFIED'
          ) {
            errors.push(
              `Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): dataQuality must be 'ILLUSTRATIVE' or 'VERIFIED'.`,
            );
          }
          if (typeof properties.distanceInMeters !== 'number' ||
              !Number.isFinite(properties.distanceInMeters) ||
              properties.distanceInMeters <= 0) {
            errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): distanceInMeters must be a positive finite number.`);
          }
          for (const flag of ['isBiDirectional', 'isAccessibleForWheelchair']) {
            if (properties[flag] !== undefined && typeof properties[flag] !== 'boolean') {
              errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): ${flag} must be a boolean.`);
            }
          }
        } else {
          errors.push(`Feature[${index}] (Edge): properties must be an object.`);
        }

        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): LineString must contain at least 2 valid coordinate points.`);
        } else {
          coordinates.forEach((position, positionIndex) => {
            if (!isPosition(position)) {
              errors.push(`Feature[${index}] (Edge '${String(edgeId ?? 'unknown')}'): coordinate ${positionIndex} must be a valid [longitude, latitude] pair.`);
            }
          });
        }

        if (isNonEmptyString(sourceId) && isNonEmptyString(targetId) &&
            graph.has(sourceId) && graph.has(targetId)) {
          graph.get(sourceId)?.add(targetId);
          graph.get(targetId)?.add(sourceId);
        }
      } else if (geometry.type === 'Polygon') {
        polygonsCount++;
        if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
          errors.push(`Feature[${index}] (Polygon): coordinates must contain at least one linear ring.`);
        } else {
          geometry.coordinates.forEach((ring, ringIndex) => {
            if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isPosition)) {
              errors.push(`Feature[${index}] (Polygon): ring ${ringIndex} must contain at least 4 valid coordinate pairs.`);
              return;
            }
            const first = ring[0];
            const last = ring[ring.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              errors.push(`Feature[${index}] (Polygon): ring ${ringIndex} must be closed.`);
            }
          });
        }
      } else {
        errors.push(`Feature[${index}]: unsupported or missing geometry type.`);
      }
    }

    const connectedComponentsCount = this.countConnectedComponents(graph);
    if (connectedComponentsCount > 1) {
      warnings.push(
        `Campus graph contains ${connectedComponentsCount} disconnected components; routes cannot cross between them.`,
      );
    }
    for (const [nodeId, neighbors] of graph) {
      if (neighbors.size === 0) {
        warnings.push(`Node '${nodeId}' is isolated (has no connecting edges).`);
      }
    }

    return this.result(errors, warnings, nodesCount, edgesCount, polygonsCount, connectedComponentsCount);
  }

  private countConnectedComponents(graph: Map<string, Set<string>>): number {
    const visited = new Set<string>();
    let components = 0;

    for (const nodeId of graph.keys()) {
      if (visited.has(nodeId)) continue;
      components++;
      const pending = [nodeId];

      while (pending.length > 0) {
        const current = pending.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);
        for (const neighbor of graph.get(current) ?? []) {
          if (!visited.has(neighbor)) pending.push(neighbor);
        }
      }
    }

    return components;
  }

  private result(
    errors: string[],
    warnings: string[],
    nodesCount: number,
    edgesCount: number,
    polygonsCount: number,
    connectedComponentsCount: number,
  ): ValidationResult {
    const isValid = errors.length === 0;
    if (!isValid) {
      this.logger.warn(`Campus GeoJSON validation failed with ${errors.length} errors.`);
    } else {
      this.logger.log(
        `Campus GeoJSON validated: ${nodesCount} nodes, ${edgesCount} edges, ${polygonsCount} polygons, ${connectedComponentsCount} connected components.`,
      );
    }

    return {
      isValid,
      nodesCount,
      edgesCount,
      polygonsCount,
      connectedComponentsCount,
      warnings,
      errors,
    };
  }
}
