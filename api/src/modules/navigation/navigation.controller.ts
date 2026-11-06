import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NavigationService } from './navigation.service';

@ApiTags('navigation')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get('route')
  @ApiOperation({ summary: 'Calculate shortest pedestrian path between two nodes' })
  @ApiQuery({ name: 'startNodeId', required: true, type: String })
  @ApiQuery({ name: 'endNodeId', required: true, type: String })
  async getRoute(
    @Query('startNodeId') startNodeId: string,
    @Query('endNodeId') endNodeId: string,
  ) {
    return this.navigationService.findShortestPath(startNodeId, endNodeId);
  }
}