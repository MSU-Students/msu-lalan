import { Module } from '@nestjs/common';
import { GeoJsonValidatorService } from './services/geojson-validator.service';
import { GraphBuilderService } from './services/graph-builder.service';
import { PathfindingService } from './services/pathfinding.service';

@Module({
  providers: [GeoJsonValidatorService, GraphBuilderService, PathfindingService],
  exports: [GeoJsonValidatorService, GraphBuilderService, PathfindingService],
})
export class NavigationModule {}
