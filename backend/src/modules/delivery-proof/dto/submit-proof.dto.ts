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

/** FR9 */
export class SubmitProofDto {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  photoUrl!: string;

  @ApiProperty({ type: GeoPointDto })
  @ValidateNested()
  @Type(() => GeoPointDto)
  location!: GeoPointDto;

  @ApiPropertyOptional({
    description: 'Pickup: the donor handover PIN. Delivery: the PIN read out by the recipient.',
  })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'The PIN must be 4 digits' })
  pin?: string;

  @ApiPropertyOptional({ description: 'Quantity the volunteer counted at this stage' })
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
