import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { AddressDto } from 'src/common/dto/address.dto';
import {
  DeliveryMethod,
  DietaryTag,
  HandlingInstruction,
  PickupSource,
  QuantityUnit,
} from 'src/common/enums/donation-details.enum';
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

  @ApiPropertyOptional({ enum: QuantityUnit })
  @IsOptional()
  @IsEnum(QuantityUnit)
  quantityUnit?: QuantityUnit;

  @ApiPropertyOptional({ enum: DietaryTag, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DietaryTag, { each: true })
  dietaryTags?: DietaryTag[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  foodSafetyVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({ enum: PickupSource })
  @IsOptional()
  @IsEnum(PickupSource)
  pickupSource?: PickupSource;

  @ApiPropertyOptional({ description: 'FR3 — earliest pickup time, ISO 8601' })
  @IsOptional()
  @IsDateString()
  readyFrom?: string;

  @ApiPropertyOptional({ description: 'FR3 — consume-before time, ISO 8601' })
  @IsOptional()
  @IsDateString()
  consumeBefore?: string;

  @ApiPropertyOptional({ enum: HandlingInstruction, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(HandlingInstruction, { each: true })
  handling?: HandlingInstruction[];

  @ApiPropertyOptional({ enum: DeliveryMethod })
  @IsOptional()
  @IsEnum(DeliveryMethod)
  deliveryMethod?: DeliveryMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  handoverInstructions?: string;

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
