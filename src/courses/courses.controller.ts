import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CoursesService } from './courses.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
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
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles('teacher')
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
  @Roles('teacher', 'student')
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
  async findAll(
    @Query('groupId') groupId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.coursesService.findAll(groupId, user);
  }

  @Get(':id')
  @Roles('teacher', 'student')
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
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.coursesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('teacher')
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
  @Roles('teacher')
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

  @Post(':id/image')
  @Roles('teacher')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload course image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Course image file (png, jpg, svg)',
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.coursesService.uploadImage(id, file);
  }

  @Delete(':id/image')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove course image' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Image removed successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async removeImage(@Param('id') id: string) {
    return this.coursesService.removeImage(id);
  }

  @Post(':id/enrollments')
  @Roles('teacher')
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
  @Roles('teacher')
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
  @Roles('teacher')
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
