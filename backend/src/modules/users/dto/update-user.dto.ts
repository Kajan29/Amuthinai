import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

import { AddressDto } from 'src/common/dto/address.dto';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(7)
  phone?: string;

  @ApiPropertyOptional({ enum: ['en', 'ta', 'si'] })
  @IsOptional()
  @IsIn(['en', 'ta', 'si'])
  language?: 'en' | 'ta' | 'si';

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ description: 'Expo push token for FR8 alerts' })
  @IsOptional()
  @IsString()
  pushToken?: string;
}
