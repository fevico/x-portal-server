import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SubRolesModule } from './sub-roles/sub-roles.module';
import { SchoolsModule } from './schools/schools.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ClassModule } from './class/class.module';
import { SubjectModule } from './subject/subject.module';
import { ArmModule } from './arm/arm.module';
import { HttpModule } from '@nestjs/axios';
import { LoggingModule } from './log/loggging.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PingService } from './ping/ping.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),
    UsersModule,
    AuthModule,
    PrismaModule,
    PermissionsModule,
    SubRolesModule,
    SchoolsModule,
    SubscriptionModule,
    ClassModule,
    SubjectModule,
    ArmModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    LoggingModule,
    ScheduleModule.forRoot(), // starts the cron system
    HttpModule,
  ],
  controllers: [AppController],
  providers: [AppService, PingService],
})
export class AppModule {}
