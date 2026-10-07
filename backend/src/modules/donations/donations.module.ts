import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChatModule } from 'src/modules/chat/chat.module';
import {
  FoodRequest,
  FoodRequestSchema,
} from 'src/modules/food-requests/schemas/food-request.schema';
import { PointsModule } from 'src/modules/points/points.module';
import { StatusHistoryModule } from 'src/modules/status-history/status-history.module';

import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { Donation, DonationSchema } from './schemas/donation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
      { name: FoodRequest.name, schema: FoodRequestSchema },
    ]),
    StatusHistoryModule,
    ChatModule,
    PointsModule,
  ],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
