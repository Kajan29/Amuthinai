import { Module } from '@nestjs/common';

import { AssignmentsModule } from 'src/modules/assignments/assignments.module';
import { DonationsModule } from 'src/modules/donations/donations.module';
import { EnquiriesModule } from 'src/modules/enquiries/enquiries.module';
import { FoodRequestsModule } from 'src/modules/food-requests/food-requests.module';
import { NgosModule } from 'src/modules/ngos/ngos.module';
import { UsersModule } from 'src/modules/users/users.module';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    DonationsModule,
    FoodRequestsModule,
    AssignmentsModule,
    EnquiriesModule,
    UsersModule,
    NgosModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
