import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { AssignmentStatus } from 'src/common/enums/assignment-status.enum';

export class QueryAssignmentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AssignmentStatus })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}
