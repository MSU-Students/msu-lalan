import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@msumain.edu.ph' })
  @IsEmail()
  @MaxLength(255)
  username: string;

  @ApiProperty({ example: 'your-password', minLength: 1, maxLength: 72, format: 'password' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}