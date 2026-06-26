import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation ID (omit to create new)' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;
}

export class CreateConversationDto {
  @ApiProperty({ description: 'Conversation title', required: false })
  @IsOptional()
  @IsString()
  title?: string;
}
