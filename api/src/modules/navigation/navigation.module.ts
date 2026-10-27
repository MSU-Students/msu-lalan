import { Module } from '@nestjs/common';
import { GeoJsonValidatorService } from './services/geojson-validator.service';
import { GraphBuilderService } from './services/graph-builder.service';

@Module({
  providers: [GeoJsonValidatorService, GraphBuilderService],
  exports: [GeoJsonValidatorService, GraphBuilderService],
})
export class NavigationModule {}
