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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
