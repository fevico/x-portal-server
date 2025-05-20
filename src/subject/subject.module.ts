import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectsController } from './subject.controller';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SubjectService],
  controllers: [SubjectsController],
})
export class SubjectModule {}
