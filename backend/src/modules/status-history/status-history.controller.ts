import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

import { StatusHistoryService } from './status-history.service';

@ApiTags('status-history')
@ApiBearerAuth()
@Controller('status-history')
export class StatusHistoryController {
  constructor(private readonly statusHistoryService: StatusHistoryService) {}

  @Get(':donationId/verify')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'NFR7 — recompute the hash chain for one donation' })
  verify(@Param('donationId') donationId: string) {
    return this.statusHistoryService.verifyChain(donationId);
  }
}
