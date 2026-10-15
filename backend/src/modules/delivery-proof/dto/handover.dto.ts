import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { GeoPointDto } from 'src/common/dto/address.dto';

/** The donor confirms an in-person handover by typing the code the recipient reads out. */
export class HandoverDto {
  @ApiProperty({ description: "The recipient's 4-digit handover code" })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'The code must be 4 digits' })
  pin!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  photoUrl?: string;

  @ApiPropertyOptional({ type: GeoPointDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  location?: GeoPointDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityConfirmed?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
