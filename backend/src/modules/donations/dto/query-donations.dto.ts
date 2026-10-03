import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { DonationStatus } from 'src/common/enums/donation-status.enum';

export class QueryDonationsDto extends PaginationQueryDto {
  /** Accepts `?status=approved` or `?status=approved,assigned`. */
  @ApiPropertyOptional({ enum: DonationStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : String(value).split(','),
  )
  @IsEnum(DonationStatus, { each: true })
  status?: DonationStatus[];
}
