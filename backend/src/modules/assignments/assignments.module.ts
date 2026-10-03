import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DeliveryProofModule } from 'src/modules/delivery-proof/delivery-proof.module';
import { DonationsModule } from 'src/modules/donations/donations.module';
import { FoodRequestsModule } from 'src/modules/food-requests/food-requests.module';
import { NotificationsModule } from 'src/modules/notifications/notifications.module';
import { PointsModule } from 'src/modules/points/points.module';
import { UsersModule } from 'src/modules/users/users.module';

import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { Assignment, AssignmentSchema } from './schemas/assignment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Assignment.name, schema: AssignmentSchema }]),
    DonationsModule,
    FoodRequestsModule,
    UsersModule,
    DeliveryProofModule,
    NotificationsModule,
    PointsModule,
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
