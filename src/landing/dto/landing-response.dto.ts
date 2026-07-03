import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LandingContentDto } from './landing-content.dto';

class LandingValidationDto {
  @ApiProperty()
  canPublish: boolean;

  @ApiProperty({ type: [String] })
  warnings: string[];

  @ApiProperty({ type: [String] })
  errors: string[];
}

export class LandingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED'] })
  status: 'DRAFT' | 'PUBLISHED';

  @ApiPropertyOptional()
  seoTitle?: string | null;

  @ApiPropertyOptional()
  seoDescription?: string | null;

  @ApiPropertyOptional()
  ogImageUrl?: string | null;

  @ApiProperty({ type: LandingContentDto })
  content: LandingContentDto;

  @ApiProperty({ type: LandingValidationDto })
  validation: LandingValidationDto;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional()
  publishedAt?: string | null;
}
