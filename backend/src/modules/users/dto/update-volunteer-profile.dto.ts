import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';

import { AddressDto } from 'src/common/dto/address.dto';
import { VehicleType } from 'src/common/enums/vehicle-type.enum';

/** FR7 — the fields that decide which pickups a volunteer is offered. */
export class UpdateVolunteerProfileDto {
  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  travelRadiusKm?: number;

  @ApiPropertyOptional({ description: 'Ready for deliveries toggle' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ type: AddressDto, description: 'Home base used as the search origin' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
