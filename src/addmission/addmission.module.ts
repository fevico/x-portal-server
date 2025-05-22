import { Module } from '@nestjs/common';
import { AddmissionController } from './addmission.controller';
import { AddmissionService } from './addmission.service';

@Module({
  controllers: [AddmissionController],
  providers: [AddmissionService]
})
export class AddmissionModule {}
