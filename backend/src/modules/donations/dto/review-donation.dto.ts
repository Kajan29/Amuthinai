import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** FR4 — a rejection must explain itself; the donor sees this text verbatim. */
export class RejectDonationDto {
  @ApiProperty({ minLength: 5 })
  @IsString()
  @MinLength(5)
  reason!: string;
}
