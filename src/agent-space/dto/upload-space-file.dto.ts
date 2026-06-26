import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadSpaceFileDto {
  @ApiProperty({ description: 'Filename with extension (.md or .txt)' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'File content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'File type', enum: ['md', 'txt'], default: 'md' })
  @IsOptional()
  @IsIn(['md', 'txt'])
  fileType?: string;
}

export class UpdateSpaceFileDto {
  @ApiProperty({ description: 'Updated file content' })
  @IsString()
  content: string;
}

export class SearchSpaceDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  q: string;

  @ApiProperty({ description: 'Max results', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
