import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderDto {
  @ApiProperty({
    description: 'Element IDs in new order (must include all elements)',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  elementIds: string[];
}
