import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId: string;

  @ApiProperty({
    description: 'Note category',
    enum: [
      'learning_style',
      'weakness',
      'strength',
      'preference',
      'progress',
      'general',
    ],
    default: 'general',
  })
  @IsOptional()
  @IsIn([
    'learning_style',
    'weakness',
    'strength',
    'preference',
    'progress',
    'general',
  ])
  category?: string;

  @ApiProperty({ description: 'Note content / observation text' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Source of the note', default: 'agent' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'OpenCode session ID', required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ description: 'Synthesized agent profile JSON' })
  profile: Record<string, unknown>;
}
