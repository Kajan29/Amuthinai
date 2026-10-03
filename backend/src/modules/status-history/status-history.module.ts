import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { StatusEvent, StatusEventSchema } from './schemas/status-event.schema';
import { StatusHistoryController } from './status-history.controller';
import { StatusHistoryService } from './status-history.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: StatusEvent.name, schema: StatusEventSchema }])],
  controllers: [StatusHistoryController],
  providers: [StatusHistoryService],
  exports: [StatusHistoryService],
})
export class StatusHistoryModule {}
