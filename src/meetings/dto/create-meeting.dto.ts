import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsISO8601 } from 'class-validator';

export class CreateMeetingDto {
  @ApiProperty({
    description: 'Requested meeting start time (ISO 8601)',
    example: '2026-07-20T13:00:00.000Z',
  })
  @IsISO8601()
  requestedDate: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  teacherNotes?: string;
}
