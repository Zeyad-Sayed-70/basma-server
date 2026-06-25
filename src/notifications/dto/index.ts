import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    enum: ['SESSION_REMINDER', 'QUIZ_GRADED', 'ASSIGNMENT_DUE', 'CUSTOM'],
  })
  @IsIn(['SESSION_REMINDER', 'QUIZ_GRADED', 'ASSIGNMENT_DUE', 'CUSTOM'])
  type: 'SESSION_REMINDER' | 'QUIZ_GRADED' | 'ASSIGNMENT_DUE' | 'CUSTOM';

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientPhone?: string;
}

export class SendAnnouncementDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  groupIds: string[];
}

export class UpdateNotificationPreferenceDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

export class ConnectWhatsAppDto {
  @ApiProperty({ enum: ['qr', 'pairing'] })
  @IsString()
  @IsIn(['qr', 'pairing'])
  method: 'qr' | 'pairing';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
