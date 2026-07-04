import { Module } from '@nestjs/common';
import { DomainCheckController } from './domain-check.controller';

@Module({
  controllers: [DomainCheckController],
})
export class DomainCheckModule {}
