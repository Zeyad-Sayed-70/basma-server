import { IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TypingDto {
  @ApiProperty({ description: 'Group ID' })
  @IsString()
  groupId: string;

  @ApiProperty({ description: 'Whether the user is typing' })
  @IsBoolean()
  isTyping: boolean;
}
