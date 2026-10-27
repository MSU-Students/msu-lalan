import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller';
import { CampusNavigationService } from './services/campus-navigation.service';
import { GeoJsonValidatorService } from './services/geojson-validator.service';
import { GraphBuilderService } from './services/graph-builder.service';
import { PathfindingService } from './services/pathfinding.service';

@Module({
  controllers: [NavigationController],
  providers: [
    GeoJsonValidatorService,
    GraphBuilderService,
    PathfindingService,
    CampusNavigationService,
  ],
  exports: [
    GeoJsonValidatorService,
    GraphBuilderService,
    PathfindingService,
    CampusNavigationService,
  ],
})
export class NavigationModule {}
