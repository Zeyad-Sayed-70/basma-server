import { ApiProperty } from '@nestjs/swagger';
import { MeetingRequestStatus } from '@prisma/client';

export class MeetingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  instanceId: string;

  @ApiProperty()
  requestedDate: string;

  @ApiProperty({ enum: MeetingRequestStatus })
  status: MeetingRequestStatus;

  @ApiProperty({ required: false })
  teacherNotes?: string;

  @ApiProperty({ required: false })
  adminNotes?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class MeetingListResponseDto {
  @ApiProperty({ type: [MeetingResponseDto] })
  data: MeetingResponseDto[];

  @ApiProperty()
  total: number;
}
