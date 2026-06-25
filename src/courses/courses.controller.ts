import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CourseResponseDto,
  CourseListResponseDto,
} from './dto/course-response.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentListResponseDto } from './dto/enrollment-response.dto';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('teacher')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new course',
    description:
      'Creates a course within a group. ' +
      'All sessions, quizzes, assignments, and enrollments will be scoped to this course. ' +
      "Courses are tenant-isolated — only visible within the teacher's instance.",
  })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all courses',
    description:
      "Returns all courses for the authenticated teacher's instance. " +
      'Optionally filter by groupId to get courses in a specific group. ' +
      'Includes enrolled student counts.',
  })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'Filter by group ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
    type: CourseListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query('groupId') groupId?: string) {
    return this.coursesService.findAll(groupId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get course by ID',
    description:
      'Returns a single course with its details and enrolled student count. ' +
      'Includes sessions, quizzes, and assignments counts.',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Course retrieved successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update course',
    description:
      'Updates course title, description, or price. ' +
      'Only fields provided in the request body will be updated.',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({
    status: 200,
    description: 'Course updated successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete course',
    description:
      'Deletes a course and all its associated data ' +
      '(sessions, quizzes, quiz questions, assignments, submissions, enrollments, payments). ' +
      'This action is irreversible.',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 204, description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    await this.coursesService.remove(id);
  }

  @Post(':id/enrollments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enroll students in course',
    description:
      'Enrolls one or more students in a course. ' +
      'Students must belong to the same group as the course. ' +
      'Duplicate enrollments are silently ignored (idempotent).',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiBody({ type: CreateEnrollmentDto })
  @ApiResponse({
    status: 201,
    description: 'Students enrolled successfully',
    type: EnrollmentListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({
    status: 400,
    description: 'Some students not found or not in the same group',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async enroll(@Param('id') id: string, @Body() dto: CreateEnrollmentDto) {
    return this.coursesService.enroll(id, dto);
  }

  @Delete(':courseId/enrollments/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unenroll student from course',
    description:
      "Removes a student's enrollment from a course. " +
      'Does not delete the student or course — only the enrollment link.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 204,
    description: 'Student unenrolled successfully',
  })
  @ApiResponse({ status: 404, description: 'Course or enrollment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unenroll(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.coursesService.unenroll(courseId, studentId);
  }

  @Get(':id/enrollments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List enrolled students',
    description:
      'Returns all students enrolled in a course. ' +
      'Includes student name, email, and enrollment date.',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    type: EnrollmentListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findEnrollments(@Param('id') id: string) {
    return this.coursesService.findEnrollments(id);
  }
}
