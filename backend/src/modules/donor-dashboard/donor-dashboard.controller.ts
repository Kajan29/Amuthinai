import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

import { DonorDashboardService } from './donor-dashboard.service';

@ApiTags('donor')
@ApiBearerAuth()
@Controller('donor')
export class DonorDashboardController {
  constructor(private readonly dashboard: DonorDashboardService) {}

  @Get('dashboard')
  @Roles(Role.Donor)
  @ApiOperation({ summary: 'Donor home — stats, active contributions, and donation cards' })
  getDashboard(@CurrentUser('id') donorId: string) {
    return this.dashboard.forDonor(donorId);
  }
}
