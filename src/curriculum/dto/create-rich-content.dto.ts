import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray } from 'class-validator';

export class CreateRichContentDto {
  @ApiProperty({ description: 'Element title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Tiptap-compatible JSON body (array of nodes)' })
  @IsArray()
  bodyJson: Record<string, unknown>[];
}
