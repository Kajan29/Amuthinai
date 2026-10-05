import { Module } from '@nestjs/common';

import { AssignmentsModule } from 'src/modules/assignments/assignments.module';
import { DonationsModule } from 'src/modules/donations/donations.module';
import { FoodRequestsModule } from 'src/modules/food-requests/food-requests.module';
import { PointsModule } from 'src/modules/points/points.module';
import { UsersModule } from 'src/modules/users/users.module';

import { DonorDashboardController } from './donor-dashboard.controller';
import { DonorDashboardService } from './donor-dashboard.service';

@Module({
  imports: [DonationsModule, AssignmentsModule, FoodRequestsModule, PointsModule, UsersModule],
  controllers: [DonorDashboardController],
  providers: [DonorDashboardService],
})
export class DonorDashboardModule {}
