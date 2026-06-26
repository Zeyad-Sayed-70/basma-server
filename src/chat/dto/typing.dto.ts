import { IsString, IsBoolean } from 'class-validator';

export class TypingDto {
  @IsString()
  groupId: string;

  @IsBoolean()
  isTyping: boolean;
}
