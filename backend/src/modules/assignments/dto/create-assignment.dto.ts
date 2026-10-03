import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

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
