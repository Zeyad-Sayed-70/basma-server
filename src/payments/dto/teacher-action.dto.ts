import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TeacherActionDto {
  @ApiPropertyOptional({
    description: 'Optional notes (e.g. rejection reason)',
    example: 'Payment not received in my account',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
