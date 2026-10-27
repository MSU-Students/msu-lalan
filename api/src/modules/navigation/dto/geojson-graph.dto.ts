export type Position = [number, number];

export interface PointGeometryDto {
  type: 'Point';
  coordinates: Position;
}

export interface LineStringGeometryDto {
  type: 'LineString';
  coordinates: Position[];
}

export interface PolygonGeometryDto {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface NodePropertiesDto {
  id: string;
  name: string;
  acronym?: string;
  nodeType: string;
  category?: string;
  elevation?: number;
}

export interface EdgePropertiesDto {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  distanceInMeters: number;
  dataQuality?: 'ILLUSTRATIVE' | 'VERIFIED';
  isAccessibleForWheelchair?: boolean;
  isBiDirectional?: boolean;
}

export interface GeoJsonFeatureDto<Geometry, Properties> {
  type: 'Feature';
  geometry: Geometry;
  properties: Properties;
}

export type CampusGraphFeatureDto =
  | GeoJsonFeatureDto<PointGeometryDto, NodePropertiesDto>
  | GeoJsonFeatureDto<LineStringGeometryDto, EdgePropertiesDto>
  | GeoJsonFeatureDto<PolygonGeometryDto, Record<string, unknown>>;

export interface CampusGraphGeoJsonDto {
  type: 'FeatureCollection';
  name?: string;
  crs?: unknown;
  features: CampusGraphFeatureDto[];
}
