import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ProgressService } from './progress.service';
import { ProgressUpdateDto } from './dto/progress-update.dto';
import {
  ElementProgressResponseDto,
  CourseProgressResponseDto,
  CurriculumProgressResponseDto,
} from './dto/progress-response.dto';

@ApiTags('Curriculum')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('courses/:courseId/progress')
  @Roles('student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get course progress for current student',
    description:
      'Returns the overall course progress (percentage, completed/total required elements).',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Course progress retrieved',
    type: CourseProgressResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — student role required' })
  async getCourseProgress(
    @Param('courseId') courseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.progressService.getStudentCourseProgress(courseId, user.id);
  }

  @Get('curriculum/:id/progress')
  @Roles('student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get per-element progress for a curriculum',
    description:
      'Returns progress for every element in the curriculum plus aggregated course progress.',
  })
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum progress retrieved',
    type: CurriculumProgressResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — student role required' })
  async getCurriculumProgress(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.progressService.getCurriculumProgress(id, user.id);
  }

  @Post('elements/:id/progress/start')
  @Roles('student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark element as started',
    description:
      'Sets the element progress status to IN_PROGRESS. ' +
      'Idempotent — calling again updates the startedAt timestamp.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiResponse({
    status: 200,
    description: 'Element marked as started',
    type: ElementProgressResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — student role required' })
  @ApiResponse({ status: 404, description: 'Element not found' })
  async startElement(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.progressService.startElement(id, user.id);
  }

  @Patch('elements/:id/progress')
  @Roles('student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update element progress percentage',
    description:
      'Updates the progress percentage (0-100). ' +
      'If progressPercent >= 95, status auto-advances to COMPLETED. ' +
      'Triggers course-level progress recomputation.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiBody({ type: ProgressUpdateDto })
  @ApiResponse({
    status: 200,
    description: 'Progress updated',
    type: ElementProgressResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request — invalid percentage' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — student role required' })
  @ApiResponse({ status: 404, description: 'Element not found' })
  async updateProgress(
    @Param('id') id: string,
    @Body() dto: ProgressUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.progressService.updateProgress(
      id,
      user.id,
      dto.progressPercent,
    );
  }

  @Post('elements/:id/progress/complete')
  @Roles('student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark element as completed',
    description:
      'Sets the element progress status to COMPLETED with 100%. ' +
      'Triggers course-level progress recomputation.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiResponse({
    status: 200,
    description: 'Element marked as completed',
    type: ElementProgressResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — student role required' })
  @ApiResponse({ status: 404, description: 'Element not found' })
  async completeElement(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.progressService.completeElement(id, user.id);
  }

  @Get('courses/:courseId/students/:studentId/progress')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get a student's course progress (teacher view)",
    description:
      "Allows a teacher to view any student's overall progress in a course.",
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Student course progress retrieved',
    type: CourseProgressResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  async getStudentProgress(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.progressService.getStudentCourseProgress(courseId, studentId);
  }
}
