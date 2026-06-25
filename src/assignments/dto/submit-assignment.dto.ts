import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitAssignmentDto {
  @ApiPropertyOptional({
    example: 'إليك حل التمارين...',
    description: 'Text content of the submission',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'File attachment (uploaded to MinIO storage)',
  })
  @IsOptional()
  file?: Express.Multer.File;
}
