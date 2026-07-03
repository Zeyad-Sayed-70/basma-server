import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  IsObject,
  IsUrl,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PLATFORMS = [
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'whatsapp',
  'telegram',
  'website',
] as const;

const CTA_TYPES = ['REGISTER', 'COURSES', 'WHATSAPP', 'CUSTOM_URL'] as const;

const FEATURE_ICONS = [
  'book',
  'calendar',
  'chat',
  'certificate',
  'target',
  'video',
] as const;

const TEMPLATES = ['classic-academy'] as const;

export class LandingCtaDto {
  @ApiProperty({ example: 'سجل الآن' })
  @IsString()
  @MaxLength(60)
  label: string;

  @ApiProperty({ enum: CTA_TYPES, example: 'REGISTER' })
  @IsEnum(CTA_TYPES)
  type: 'REGISTER' | 'COURSES' | 'WHATSAPP' | 'CUSTOM_URL';

  @ApiPropertyOptional({ example: '/courses' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  href?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courseId?: string;
}

class LandingHeroDto {
  @ApiPropertyOptional({ example: 'أكاديمية' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  eyebrow?: string;

  @ApiProperty({ example: 'مرحباً بكم في أكاديميتنا' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'نعلّم الأجيال القادمة' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ type: LandingCtaDto })
  @ValidateNested()
  @Type(() => LandingCtaDto)
  primaryCta: LandingCtaDto;

  @ApiPropertyOptional({ type: LandingCtaDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => LandingCtaDto)
  secondaryCta?: LandingCtaDto;
}

class LandingStatDto {
  @ApiProperty({ example: 'عدد الطلاب' })
  @IsString()
  @MaxLength(200)
  label: string;

  @ApiProperty({ example: '500' })
  @IsString()
  @MaxLength(100)
  value: string;
}

class LandingAboutDto {
  @ApiProperty({ example: 'عن الأكاديمية' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'نحن مؤسسة تعليمية...' })
  @IsString()
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    type: [LandingStatDto],
    example: [{ label: 'عدد الطلاب', value: '500' }],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LandingStatDto)
  @ArrayMaxSize(6)
  stats?: LandingStatDto[];
}

class LandingFeaturedCoursesDto {
  @ApiPropertyOptional({ example: 'دوراتنا' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'اختر من بين دوراتنا المتميزة' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ enum: ['MANUAL', 'LATEST', 'NONE'], example: 'LATEST' })
  @IsEnum(['MANUAL', 'LATEST', 'NONE'])
  mode: 'MANUAL' | 'LATEST' | 'NONE';

  @ApiProperty({ example: [] })
  @IsArray()
  @IsString({ each: true })
  courseIds: string[];
}

class LandingFeatureDto {
  @ApiProperty({ example: 'تعلم تفاعلي' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'نستخدم أحدث أساليب التعليم' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ enum: FEATURE_ICONS, example: 'book' })
  @IsEnum(FEATURE_ICONS)
  @IsOptional()
  icon?: 'book' | 'calendar' | 'chat' | 'certificate' | 'target' | 'video';
}

class LandingTestimonialDto {
  @ApiProperty({ example: 'أحمد محمد' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'تجربة رائعة جداً' })
  @IsString()
  @MaxLength(1000)
  quote: string;

  @ApiPropertyOptional({ example: 'طالب' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  role?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

class LandingFaqDto {
  @ApiProperty({ example: 'ما هي رسوم التسجيل؟' })
  @IsString()
  @MaxLength(300)
  question: string;

  @ApiProperty({ example: 'التسجيل مجاني تماماً' })
  @IsString()
  @MaxLength(2000)
  answer: string;
}

class LandingSocialLinkDto {
  @ApiProperty({ enum: PLATFORMS, example: 'facebook' })
  @IsEnum(PLATFORMS)
  platform:
    | 'facebook'
    | 'instagram'
    | 'youtube'
    | 'tiktok'
    | 'whatsapp'
    | 'telegram'
    | 'website';

  @ApiPropertyOptional({ example: 'فيسبوك' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  label?: string;

  @ApiProperty({ example: 'https://facebook.com/myacademy' })
  @IsString()
  @MaxLength(500)
  url: string;
}

class LandingContactDto {
  @ApiPropertyOptional({ example: '+201234567890' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '+201234567890' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'info@academy.com' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: 'القاهرة، مصر' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;
}

export class LandingContentDto {
  @ApiProperty({ enum: TEMPLATES, example: 'classic-academy' })
  @IsEnum(TEMPLATES)
  template: 'classic-academy';

  @ApiProperty({ type: LandingHeroDto })
  @ValidateNested()
  @Type(() => LandingHeroDto)
  hero: LandingHeroDto;

  @ApiPropertyOptional({ type: LandingAboutDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => LandingAboutDto)
  about?: LandingAboutDto;

  @ApiProperty({ type: LandingFeaturedCoursesDto })
  @ValidateNested()
  @Type(() => LandingFeaturedCoursesDto)
  featuredCourses: LandingFeaturedCoursesDto;

  @ApiPropertyOptional({ type: [LandingFeatureDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LandingFeatureDto)
  @ArrayMaxSize(12)
  features?: LandingFeatureDto[];

  @ApiPropertyOptional({ type: [LandingTestimonialDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LandingTestimonialDto)
  @ArrayMaxSize(20)
  testimonials?: LandingTestimonialDto[];

  @ApiPropertyOptional({ type: [LandingFaqDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LandingFaqDto)
  @ArrayMaxSize(30)
  faqs?: LandingFaqDto[];

  @ApiPropertyOptional({ type: [LandingSocialLinkDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LandingSocialLinkDto)
  @ArrayMaxSize(20)
  socialLinks?: LandingSocialLinkDto[];

  @ApiPropertyOptional({ type: LandingContactDto })
  @ValidateNested()
  @IsOptional()
  @Type(() => LandingContactDto)
  contact?: LandingContactDto;
}
