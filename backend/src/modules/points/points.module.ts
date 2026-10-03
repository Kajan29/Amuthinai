import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UsersModule } from 'src/modules/users/users.module';

import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { PointsEntry, PointsEntrySchema } from './schemas/points-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PointsEntry.name, schema: PointsEntrySchema }]),
    UsersModule,
  ],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
