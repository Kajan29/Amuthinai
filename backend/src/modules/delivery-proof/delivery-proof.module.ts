import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DeliveryProofController } from './delivery-proof.controller';
import { DeliveryProofService } from './delivery-proof.service';
import { DeliveryProof, DeliveryProofSchema } from './schemas/delivery-proof.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: DeliveryProof.name, schema: DeliveryProofSchema }])],
  controllers: [DeliveryProofController],
  providers: [DeliveryProofService],
  exports: [DeliveryProofService],
})
export class DeliveryProofModule {}
