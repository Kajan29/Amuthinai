import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { AddressDto } from 'src/common/dto/address.dto';

/** FR5 */
export class CreateFoodRequestDto {
  @ApiProperty({ minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  servingsNeeded!: number;

  @ApiProperty({ description: 'ISO 8601 — when the food is needed by' })
  @IsDateString()
  neededBy!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: AddressDto, description: 'FR5 — pinned on the map by the recipient' })
  @ValidateNested()
  @Type(() => AddressDto)
  dropAddress!: AddressDto;
}
