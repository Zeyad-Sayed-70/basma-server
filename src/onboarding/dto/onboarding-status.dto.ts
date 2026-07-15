import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaveAnswersDto } from './save-answers.dto';

export class OnboardingStatusDto {
  @ApiProperty({ description: 'هل اكتمل الأونبوردينغ' })
  completed: boolean;

  @ApiPropertyOptional({
    type: SaveAnswersDto,
    description: 'الإجابات المحفوظة (إن وجدت)',
  })
  answers?: SaveAnswersDto | null;

  @ApiProperty({ description: 'هل تم توليد الصفحة' })
  generated: boolean;
}
