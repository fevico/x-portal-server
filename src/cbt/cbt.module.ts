import { Module } from '@nestjs/common';
import { CbtService } from './cbt.service';
import { CbtController } from './cbt.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CbtService],
  controllers: [CbtController],
})
export class CbtModule {}
