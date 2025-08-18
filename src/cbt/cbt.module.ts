import { Module } from '@nestjs/common';
import { CbtService } from './cbt.service';
import { CbtController } from './cbt.controller';

@Module({
  providers: [CbtService],
  controllers: [CbtController],
})
export class CbtModule {}
