import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FoodRequestsController } from './food-requests.controller';
import { FoodRequestsService } from './food-requests.service';
import { FoodRequest, FoodRequestSchema } from './schemas/food-request.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: FoodRequest.name, schema: FoodRequestSchema }])],
  controllers: [FoodRequestsController],
  providers: [FoodRequestsService],
  exports: [FoodRequestsService],
})
export class FoodRequestsModule {}
