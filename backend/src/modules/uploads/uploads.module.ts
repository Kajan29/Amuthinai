import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  // Buffer in memory so the service can validate the file before anything touches disk.
  imports: [MulterModule.register({ storage: memoryStorage() })],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
