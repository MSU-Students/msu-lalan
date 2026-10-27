import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FindRouteDto } from './dto/find-route.dto';
import { CampusNavigationService } from './services/campus-navigation.service';

@ApiTags('Navigation')
@Controller('navigation')
export class NavigationController {
  constructor(private readonly navigationService: CampusNavigationService) {}

  @Get('locations')
  @ApiOperation({ summary: 'List locations in the campus walking graph' })
  getLocations() {
    return this.navigationService.getLocations();
  }

  @Post('route')
  @ApiOperation({ summary: 'Find the shortest walking route from current coordinates to a graph location' })
  @ApiBadRequestResponse({ description: 'Invalid coordinates or unknown destination' })
  findRoute(@Body() request: FindRouteDto) {
    return this.navigationService.findRoute(request);
  }
}
