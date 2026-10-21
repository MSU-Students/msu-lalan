import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @ApiProperty({ example: 'guest@example.com' })
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Campus123',
    minLength: 8,
    maxLength: 72,
    format: 'password',
    description: 'At least 8 characters with at least one letter and one number (max 72, bcrypt limit).',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Za-z]/, { message: 'password must contain at least one letter' })
  @Matches(/\d/, { message: 'password must contain at least one number' })
  password: string;

  @ApiProperty({ example: 'Fatima' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Alawi' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;
}
