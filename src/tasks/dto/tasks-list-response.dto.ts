import { ApiProperty } from '@nestjs/swagger';
import { TaskItemDto } from './task-item.dto';

export class TasksListResponseDto {
  @ApiProperty({ type: [TaskItemDto] })
  tasks: TaskItemDto[];

  @ApiProperty({ example: 3 })
  completedCount: number;

  @ApiProperty({ example: 8 })
  totalCount: number;
}
