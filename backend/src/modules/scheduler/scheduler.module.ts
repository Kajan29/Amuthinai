import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { DonationsModule } from 'src/modules/donations/donations.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { UsersModule } from 'src/modules/users/users.module';

import { FreshnessTask } from './freshness.task';

@Module({
  imports: [ScheduleModule.forRoot(), DonationsModule, NotificationsModule, UsersModule],
  providers: [FreshnessTask],
})
export class SchedulerModule {}
