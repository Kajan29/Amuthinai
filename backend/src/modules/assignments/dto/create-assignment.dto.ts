import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

/** FR6 — admin confirms a donation/volunteer pairing. */
export class CreateAssignmentDto {
  @ApiProperty()
  @IsMongoId()
  donationId!: string;

  @ApiProperty()
  @IsMongoId()
  volunteerId!: string;

  @ApiPropertyOptional({ description: 'Recipient request this delivery fulfils' })
  @IsOptional()
  @IsMongoId()
  requestId?: string;
}

export class ReassignDto {
  @ApiProperty()
  @IsMongoId()
  volunteerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class NgoFallbackDto {
  @ApiProperty()
  @IsMongoId()
  donationId!: string;

  @ApiProperty()
  @IsMongoId()
  ngoId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  requestId?: string;
}
