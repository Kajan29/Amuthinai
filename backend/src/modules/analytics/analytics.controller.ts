import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Roles(Role.Admin)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Admin dashboard counters' })
  kpis() {
    return this.analyticsService.kpis();
  }

  @Get('demand')
  @ApiOperation({ summary: 'FR8 — open demand aggregated per district' })
  demand() {
    return this.analyticsService.demandByDistrict();
  }

  @Get('reports')
  @ApiOperation({ summary: 'Summary reports and analytics breakdown' })
  reports() {
    return this.analyticsService.reports();
  }
}
