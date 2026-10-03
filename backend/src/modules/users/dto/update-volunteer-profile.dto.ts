import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';

import { AddressDto } from 'src/common/dto/address.dto';
import { VehicleType } from 'src/common/enums/vehicle-type.enum';

/** FR7 — the two fields that decide which pickups a volunteer is offered. */
export class UpdateVolunteerProfileDto {
  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ApiProperty({ minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  travelRadiusKm!: number;

  @ApiPropertyOptional({ type: AddressDto, description: 'Home base used as the search origin' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
