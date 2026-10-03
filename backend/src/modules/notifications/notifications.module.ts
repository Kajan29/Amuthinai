import { Module } from '@nestjs/common';

import { UsersModule } from 'src/modules/users/users.module';

import { NotificationsService } from './notifications.service';

@Module({
  imports: [UsersModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
