import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../auth/enums/role.enum';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User profile picture URL',
    required: false,
    example: 'https://example.com/profile.jpg',
  })
  picture?: string;

  @ApiProperty({
    description: 'Google ID (for Google OAuth users)',
    required: false,
    example: '123456789',
  })
  googleId?: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: Role,
    example: Role.CONDUCTOR,
  })
  role: Role;

  @ApiProperty({
    description: 'User creation date',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update date',
    example: '2024-01-15T08:00:00.000Z',
  })
  updatedAt: Date;
}
