import { Module } from '@nestjs/common';
import { SubRolesService } from './sub-roles.service';
import { SubRolesController } from './sub-roles.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubRolesController],
  providers: [SubRolesService],
  exports: [SubRolesService],
})
export class SubRolesModule {}
