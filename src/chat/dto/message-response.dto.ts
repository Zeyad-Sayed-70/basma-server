import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  senderName: string;

  @ApiProperty({ enum: ['TEACHER', 'STUDENT'] })
  senderRole: 'TEACHER' | 'STUDENT';

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false })
  fileUrl?: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  createdAt: string;
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  data: MessageResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty({ required: false })
  nextCursor?: string;
}

export class UnreadCountDto {
  @ApiProperty()
  groupId: string;

  @ApiProperty()
  count: number;
}

export class UnreadCountListDto {
  @ApiProperty({ type: [UnreadCountDto] })
  data: UnreadCountDto[];
}
