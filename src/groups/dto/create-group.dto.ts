import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationMode } from '@prisma/client';

export class CreateGroupDto {
  @ApiProperty({ example: 'الصف الأول الثانوي', description: 'Group name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: 'شعبة علمي رياضة',
    description: 'Optional description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: RegistrationMode,
    example: 'OPEN',
    description:
      'Student registration mode (OPEN = public sign-up, CLOSED = invitation only)',
  })
  @IsEnum(RegistrationMode)
  @IsOptional()
  registrationMode?: RegistrationMode;
}
