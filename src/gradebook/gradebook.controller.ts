import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GradebookService } from './gradebook.service';
import {
  GradebookCourseResponseDto,
  GradebookGroupResponseDto,
  GradebookStudentResponseDto,
} from './dto/gradebook-response.dto';

@ApiTags('Gradebook')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('gradebook')
export class GradebookController {
  constructor(private readonly gradebookService: GradebookService) {}

  @Get('courses/:courseId')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get course gradebook',
    description:
      'Returns a complete gradebook for a course. ' +
      'Shows all enrolled students with their quiz scores, assignment grades, ' +
      'and overall percentage. ' +
      'Quiz scores are auto-graded (MCQ) or null (theory pending). ' +
      'Assignment grades are null until the teacher grades them.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Gradebook retrieved successfully',
    type: GradebookCourseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCourseGradebook(@Param('courseId') courseId: string) {
    return this.gradebookService.getCourseGradebook(courseId);
  }

  @Get('groups/:groupId')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get group gradebook',
    description:
      'Returns an aggregated gradebook for an entire group. ' +
      'Combines quiz and assignment results across all courses in the group. ' +
      "Shows each student's performance across all courses.",
  })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Gradebook retrieved successfully',
    type: GradebookGroupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGroupGradebook(@Param('groupId') groupId: string) {
    return this.gradebookService.getGroupGradebook(groupId);
  }

  @Get('students/:studentId')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get student gradebook',
    description:
      "Returns a single student's performance across all courses. " +
      'Shows all quiz attempts with scores and all assignment submissions with grades. ' +
      'Includes overall percentage across all graded items.',
  })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Student gradebook retrieved successfully',
    type: GradebookStudentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStudentGradebook(@Param('studentId') studentId: string) {
    return this.gradebookService.getStudentGradebook(studentId);
  }
}
