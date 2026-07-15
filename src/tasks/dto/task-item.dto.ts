import { ApiProperty } from '@nestjs/swagger';

export class TaskItemDto {
  @ApiProperty({ example: 'create_first_group' })
  key: string;

  @ApiProperty({ example: 'أنشئ أول مجموعة' })
  labelAr: string;

  @ApiProperty({ example: 'Create your first group' })
  labelEn: string;

  @ApiProperty({ example: 'users' })
  icon: string;

  @ApiProperty({ example: '/dashboard/groups' })
  action: string;

  @ApiProperty()
  completed: boolean;
}
