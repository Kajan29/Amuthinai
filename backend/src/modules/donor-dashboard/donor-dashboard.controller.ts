import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { FoodRequestsService } from 'src/modules/food-requests/food-requests.service';

import { DonorDashboardService } from './donor-dashboard.service';

@ApiTags('donor')
@ApiBearerAuth()
@Controller('donor')
export class DonorDashboardController {
  constructor(
    private readonly dashboard: DonorDashboardService,
    private readonly foodRequests: FoodRequestsService,
  ) {}

  @Get('dashboard')
  @Roles(Role.Donor)
  @ApiOperation({ summary: 'Donor home — stats, active contributions, and donation cards' })
  getDashboard(@CurrentUser('id') donorId: string) {
    return this.dashboard.forDonor(donorId);
  }

  @Get('requests/:id')
  @Roles(Role.Donor)
  @ApiOperation({ summary: 'Details of a recipient request a donor is about to answer' })
  getRequest(@Param('id') id: string) {
    return this.foodRequests.openRequestForDonor(id);
  }
}
