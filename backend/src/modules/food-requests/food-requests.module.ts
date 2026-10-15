import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NgosModule } from 'src/modules/ngos/ngos.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { UsersModule } from 'src/modules/users/users.module';

import { FoodRequestsController } from './food-requests.controller';
import { FoodRequestsService } from './food-requests.service';
import { FoodRequest, FoodRequestSchema } from './schemas/food-request.schema';
import { DonationsModule } from '../donations/donations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FoodRequest.name, schema: FoodRequestSchema }]),
    DonationsModule,
    NgosModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [FoodRequestsController],
  providers: [FoodRequestsService],
  exports: [FoodRequestsService],
})
export class FoodRequestsModule {}
