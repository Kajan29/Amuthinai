import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { AddressDto } from 'src/common/dto/address.dto';

/** A recipient claiming a general donation. Missing fields fall back to their profile. */
export class ClaimDonationDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  servingsNeeded?: number;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9 ]{9,15}$/)
  contactPhone?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  dropAddress?: AddressDto;
}

/** Admin attaches an open recipient request to a general donation nobody has claimed. */
export class LinkRequestDto {
  @ApiProperty()
  @IsMongoId()
  requestId!: string;
}
