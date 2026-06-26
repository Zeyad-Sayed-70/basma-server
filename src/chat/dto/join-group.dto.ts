import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinGroupDto {
  @ApiProperty({ description: 'Group ID to join or leave' })
  @IsString()
  @IsNotEmpty()
  groupId: string;
}
