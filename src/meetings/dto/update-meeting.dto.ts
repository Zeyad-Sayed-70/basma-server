import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { MeetingRequestStatus } from '@prisma/client';

export class UpdateMeetingDto {
  @ApiProperty({ enum: MeetingRequestStatus, required: false })
  @IsEnum(MeetingRequestStatus)
  @IsOptional()
  status?: MeetingRequestStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}
