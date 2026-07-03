import { IsString, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LandingContentDto } from './landing-content.dto';
import { LandingPageStatus } from '@prisma/client';

export class UpdateLandingDto {
  @ApiPropertyOptional({ enum: LandingPageStatus })
  @IsEnum(LandingPageStatus)
  @IsOptional()
  status?: LandingPageStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoDescription?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ogImageUrl?: string;

  @ApiPropertyOptional({ type: LandingContentDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => LandingContentDto)
  content?: LandingContentDto;
}
