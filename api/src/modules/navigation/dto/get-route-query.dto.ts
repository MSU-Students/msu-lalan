import { IsNotEmpty, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetRouteQueryDto {
  @ApiProperty({
    description: 'UUID of the starting route node',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsNotEmpty({ message: 'startNodeId is required.' })
  @IsUUID('4', { message: 'startNodeId must be a valid UUID v4 format.' })
  startNodeId: string;

  @ApiProperty({
    description: 'UUID of the destination route node',
    example: 'f8bb6d6b-b9bd-380a-9c0b-4ef8bb6d6bb9',
  })
  @IsNotEmpty({ message: 'endNodeId is required.' })
  @IsUUID('4', { message: 'endNodeId must be a valid UUID v4 format.' })
  endNodeId: string;

}