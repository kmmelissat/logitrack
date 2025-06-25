import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'User profile picture URL',
    required: false,
    example: 'https://example.com/picture.jpg',
  })
  @IsOptional()
  @IsString()
  picture?: string;

  @ApiProperty({ description: 'Google ID for OAuth', required: false })
  @IsOptional()
  @IsString()
  googleId?: string;

  @ApiProperty({ description: 'User role', enum: Role, default: Role.CUSTOMER })
  @IsEnum(Role)
  role: Role;
}
