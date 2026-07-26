import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignStreamDto {
  @ApiProperty({ description: 'Quality label e.g. 720p' })
  @IsString()
  quality: string;

  @ApiProperty({ description: 'Track type: video or audio' })
  @IsString()
  track: string;

  @ApiProperty({ description: 'Container format (mp4, webm)', required: false })
  @IsString()
  @IsOptional()
  container?: string;
}
