import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { NavigationService } from './navigation.service';
import { GetRouteQueryDto } from './dto/get-route-query.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('navigation')
@Controller('api/v1/navigation')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get('route')
  @ApiOperation({ summary: 'Calculate shortest path between two nodes' })
  @ApiResponse({ status: 200, description: 'Route successfully calculated.' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid UUID parameters or missing inputs.' })
  @ApiResponse({ status: 404, description: 'Not Found - Node does not exist or destination is unreachable.' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getRoute(@Query() query: GetRouteQueryDto) {
    return this.navigationService.findShortestPath(
      query.startNodeId,
      query.endNodeId,
    );
  }
}