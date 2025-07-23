import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class VehicleAssignmentDto {
  @ApiProperty({
    description: 'Driver ID to assign the vehicle to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  driverId: string;

  @ApiProperty({
    description: 'Assignment start date',
    required: false,
    example: '2024-01-15T08:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  assignmentDate?: string;

  @ApiProperty({
    description: 'Assignment notes',
    required: false,
    example: 'Assigned for route to San Salvador',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
