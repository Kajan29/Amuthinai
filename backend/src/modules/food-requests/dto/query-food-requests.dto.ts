import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { RequestStatus } from 'src/common/enums/request-status.enum';

export class QueryFoodRequestsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}
