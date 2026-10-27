import { IsNumber, IsString, MinLength } from 'class-validator';

export class FindRouteDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  startLatitude: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  startLongitude: number;

  @IsString()
  @MinLength(1)
  destinationNodeId: string;
}
