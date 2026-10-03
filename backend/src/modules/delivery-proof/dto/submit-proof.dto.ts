import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Length, ValidateNested } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Required at delivery — read out by the recipient' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  pin?: string;
}
