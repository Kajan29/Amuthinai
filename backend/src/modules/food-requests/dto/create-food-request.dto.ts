import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  familySize?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  dietaryRequirements?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  foodCategory?: string;

  @ApiPropertyOptional({ enum: ['call', 'sms', 'whatsapp', 'in_app'] })
  @IsOptional()
  @IsIn(['call', 'sms', 'whatsapp', 'in_app'])
  contactPreference?: 'call' | 'sms' | 'whatsapp' | 'in_app';

  @ApiPropertyOptional({ enum: ['doorstep', 'hub_pickup'] })
  @IsOptional()
  @IsIn(['doorstep', 'hub_pickup'])
  deliveryMethod?: 'doorstep' | 'hub_pickup';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @ApiProperty({ type: AddressDto, description: 'FR5 — pinned on the map by the recipient' })
  @ValidateNested()
  @Type(() => AddressDto)
  dropAddress!: AddressDto;
}
