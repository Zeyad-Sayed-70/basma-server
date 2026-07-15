import {
  IsString,
  IsOptional,
  IsArray,
  IsHexColor,
  ValidateNested,
  IsIn,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ContactMethodDto {
  @ApiProperty({ enum: ['phone', 'whatsapp', 'email'], example: 'whatsapp' })
  @IsIn(['phone', 'whatsapp', 'email'])
  type: 'phone' | 'whatsapp' | 'email';

  @ApiProperty({ example: '+201234567890' })
  @IsString()
  @MaxLength(100)
  value: string;
}

export class SaveAnswersDto {
  @ApiProperty({
    example: ['الرياضيات', 'الفيزياء'],
    description: 'المواد اللي بيدرسها',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  subjects: string[];

  @ApiProperty({ example: 'طلاب ثانوية عامة', description: 'الجمهور المستهدف' })
  @IsString()
  @MaxLength(500)
  audience: string;

  @ApiProperty({
    example: 'بشرح بأسلوب مبسط وربط بالحياة العملية',
    description: 'إيه اللي يميزك كمدرس',
  })
  @IsString()
  @MaxLength(1000)
  uniqueSellingPoint: string;

  @ApiPropertyOptional({
    example: 'القاهرة، مصر',
    description: 'مكان الأكاديمية',
  })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional({ description: 'وسيلة التواصل المفضلة' })
  @ValidateNested()
  @IsOptional()
  @Type(() => ContactMethodDto)
  contactMethod?: ContactMethodDto;

  @ApiProperty({ example: '#2563eb', description: 'اللون الأساسي' })
  @IsHexColor()
  primaryColor: string;

  @ApiPropertyOptional({ description: 'رابط صورة الهيرو' })
  @IsString()
  @IsOptional()
  heroImageUrl?: string;

  @ApiPropertyOptional({ description: 'رابط صورة قسم "عن الأكاديمية"' })
  @IsString()
  @IsOptional()
  aboutImageUrl?: string;
}
