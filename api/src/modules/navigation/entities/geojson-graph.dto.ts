import { IsString, IsArray, IsNumber, IsOptional, ValidateNested, Equals, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

// --- Geometry DTOs ---
export class PointGeometryDto {
  @Equals('Point')
  type: 'Point';

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: [number, number]; // [longitude, latitude]
}

export class LineStringGeometryDto {
  @Equals('LineString')
  type: 'LineString';

  @IsArray()
  coordinates: [number, number][]; // Array of [longitude, latitude]
}

export class PolygonGeometryDto {
  @Equals('Polygon')
  type: 'Polygon';

  @IsArray()
  coordinates: [number, number][][];
}

// --- Properties DTOs ---
export class NodePropertiesDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  acronym?: string;

  @IsString()
  nodeType: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  elevation?: number;
}

export class EdgePropertiesDto {
  @IsString()
  id: string;

  @IsString()
  sourceNodeId: string; // Tumutukoy sa source Node ID

  @IsString()
  targetNodeId: string; // Tumutukoy sa target Node ID

  @IsString()
  edgeType: string;

  @IsNumber()
  @Min(0.0001, { message: 'Distance must be a positive number' })
  distanceInMeters: number;

  @IsOptional()
  @IsBoolean()
  isAccessibleForWheelchair?: boolean;

  @IsOptional()
  @IsBoolean()
  isBiDirectional?: boolean;
}

// --- GeoJSON Container DTO ---
export class CampusGraphGeoJsonDto {
  @Equals('FeatureCollection')
  type: 'FeatureCollection';

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  crs?: any;

  @IsArray()
  features: any[];
}