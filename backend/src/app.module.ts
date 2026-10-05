import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { configuration } from './config/configuration';
import { mongooseFactory } from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { DeliveryProofModule } from './modules/delivery-proof/delivery-proof.module';
import { DonationsModule } from './modules/donations/donations.module';
import { DonorDashboardModule } from './modules/donor-dashboard/donor-dashboard.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { FoodRequestsModule } from './modules/food-requests/food-requests.module';
import { NgosModule } from './modules/ngos/ngos.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PointsModule } from './modules/points/points.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { StatusHistoryModule } from './modules/status-history/status-history.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: mongooseFactory,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    AuthModule,
    UsersModule,
    DonationsModule,
    DonorDashboardModule,
    FoodRequestsModule,
    AssignmentsModule,
    DeliveryProofModule,
    StatusHistoryModule,
    ChatModule,
    EnquiriesModule,
    PointsModule,
    NgosModule,
    NotificationsModule,
    AnalyticsModule,
    UploadsModule,
    SchedulerModule,
  ],
  providers: [
    // Order matters: authenticate, then rate-limit, then check the role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
