import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
<<<<<<< HEAD
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  providers: [SubscriptionService, PrismaService],
  controllers: [SubscriptionController],
=======
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
  providers: [SubscriptionService],
  controllers: [SubscriptionController]
>>>>>>> 56174cfb557867d578e8d642b329559dccbfbf3a
})
export class SubscriptionModule {}
