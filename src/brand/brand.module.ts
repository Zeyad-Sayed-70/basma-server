import { Module } from '@nestjs/common';
import { BrandController } from './brand.controller';
import { BrandPublicController } from './brand-public.controller';
import { BrandService } from './brand.service';

@Module({
  controllers: [BrandController, BrandPublicController],
  providers: [BrandService],
  exports: [BrandService],
})
export class BrandModule {}
