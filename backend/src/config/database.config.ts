import { ConfigService } from '@nestjs/config';
import type { MongooseModuleFactoryOptions } from '@nestjs/mongoose';

export const mongooseFactory = (config: ConfigService): MongooseModuleFactoryOptions => ({
  uri: config.getOrThrow<string>('database.uri'),
  // Fail fast rather than queueing writes while the database is unreachable.
  serverSelectionTimeoutMS: 5000,
  autoIndex: config.get<string>('env') !== 'production',
});
