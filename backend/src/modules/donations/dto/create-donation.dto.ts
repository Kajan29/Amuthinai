import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { AddressDto } from 'src/common/dto/address.dto';
import { FoodType } from 'src/common/enums/food-type.enum';

/** FR2, FR3 */
export class CreateDonationDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({ enum: FoodType })
  @IsEnum(FoodType)
  foodType!: FoodType;

  @ApiProperty({ minimum: 1, maximum: 5000 })
  @IsInt()
  @Min(1)
  @Max(5000)
  servings!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  photoUrls?: string[];

  @ApiProperty({ description: 'FR3 — when the food was cooked, ISO 8601' })
  @IsDateString()
  cookedAt!: string;

  @ApiProperty({ description: 'FR3 — hours it stays safe, clamped per food type', minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(72)
  safeForHours!: number;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  pickupAddress!: AddressDto;
}
