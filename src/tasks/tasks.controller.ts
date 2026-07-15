import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { TasksService } from './tasks.service';
import { TasksListResponseDto } from './dto/tasks-list-response.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Roles('teacher')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get getting-started tasks',
    description:
      'Returns a checklist of tasks for the teacher to get started. Each task is automatically marked complete based on live data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved',
    type: TasksListResponseDto,
  })
  async findAll(): Promise<TasksListResponseDto> {
    return this.tasksService.findAll();
  }
}
