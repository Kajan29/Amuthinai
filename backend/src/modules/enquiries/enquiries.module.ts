import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AssignmentsModule } from 'src/modules/assignments/assignments.module';
import { ChatModule } from 'src/modules/chat/chat.module';
import { DeliveryProofModule } from 'src/modules/delivery-proof/delivery-proof.module';
import { DonationsModule } from 'src/modules/donations/donations.module';
import { FoodRequestsModule } from 'src/modules/food-requests/food-requests.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { UsersModule } from 'src/modules/users/users.module';

import { EnquiriesController } from './enquiries.controller';
import { EnquiriesService } from './enquiries.service';
import { Enquiry, EnquirySchema } from './schemas/enquiry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Enquiry.name, schema: EnquirySchema }]),
    UsersModule,
    NotificationsModule,
    AssignmentsModule,
    DonationsModule,
    FoodRequestsModule,
    DeliveryProofModule,
    ChatModule,
  ],
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
