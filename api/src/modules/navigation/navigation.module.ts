import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { RouteNode } from './entities/route-node.entity';
import { RouteEdge } from './entities/route-edge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RouteNode, RouteEdge])],
  controllers: [NavigationController],
  providers: [NavigationService],
  exports: [NavigationService],
})
export class NavigationModule {}