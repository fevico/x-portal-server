import { Module } from '@nestjs/common';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import { JwtModule } from '@nestjs/jwt';
import { LoggingModule } from '@/log/loggging.module';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  imports: [JwtModule, LoggingModule],
  controllers: [ScoreController],
  providers: [ScoreService, PrismaService],
})
export class ScoreModule {}
