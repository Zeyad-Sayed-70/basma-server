import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LandingContentDto } from './landing-content.dto';

class PublicInstanceDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  subdomain: string;

  @ApiPropertyOptional()
  customDomain?: string | null;
}

class PublicBrandDto {
  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiProperty()
  primaryColor: string;

  @ApiProperty()
  secondaryColor: string;

  @ApiProperty()
  fontFamily: string;

  @ApiProperty()
  whiteLabelEnabled: boolean;
}

class PublicLandingDto {
  @ApiProperty({ enum: ['PUBLISHED'] })
  status: 'PUBLISHED';

  @ApiPropertyOptional()
  seoTitle?: string | null;

  @ApiPropertyOptional()
  seoDescription?: string | null;

  @ApiPropertyOptional()
  ogImageUrl?: string | null;

  @ApiProperty({ type: LandingContentDto })
  content: LandingContentDto;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  publishedAt: string;
}

class PublicCourseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  groupName: string;

  @ApiProperty({ enum: ['OPEN', 'CLOSED'] })
  registrationMode: 'OPEN' | 'CLOSED';

  @ApiPropertyOptional()
  studentCount?: number;
}

export class LandingPublicResponseDto {
  @ApiProperty({ type: PublicInstanceDto })
  instance: PublicInstanceDto;

  @ApiProperty({ type: PublicBrandDto })
  brand: PublicBrandDto;

  @ApiProperty({ type: PublicLandingDto })
  landing: PublicLandingDto;

  @ApiProperty({ type: [PublicCourseDto] })
  courses: PublicCourseDto[];
}
