import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NgosController } from './ngos.controller';
import { NgosService } from './ngos.service';
import { Ngo, NgoSchema } from './schemas/ngo.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Ngo.name, schema: NgoSchema }])],
  controllers: [NgosController],
  providers: [NgosService],
  exports: [NgosService],
})
export class NgosModule {}
