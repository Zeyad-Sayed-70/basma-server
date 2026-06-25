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
  UseInterceptors,
  UploadedFile,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import {
  AssignmentResponseDto,
  AssignmentListResponseDto,
} from './dto/assignment-response.dto';
import {
  SubmissionResponseDto,
  SubmissionListResponseDto,
} from './dto/submission-response.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new assignment',
    description:
      'Creates an assignment within a course. ' +
      'Students can submit text and/or file attachments. ' +
      'An optional due date can be set for submission deadline.',
  })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiResponse({
    status: 201,
    description: 'Assignment created successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(dto);
  }

  @Get()
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all assignments',
    description:
      "Returns all assignments for the authenticated teacher's instance. " +
      'Optionally filter by courseId.',
  })
  @ApiQuery({
    name: 'courseId',
    required: false,
    description: 'Filter by course ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignments retrieved successfully',
    type: AssignmentListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query('courseId') courseId?: string) {
    return this.assignmentsService.findAll(courseId);
  }

  @Get(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get assignment by ID',
    description:
      'Returns a single assignment with full details including due date and description.',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment retrieved successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return this.assignmentsService.findOne(id);
  }

  @Patch(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update assignment',
    description:
      'Updates assignment title, description, or due date. ' +
      'Only fields provided in the request body will be updated.',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiBody({ type: UpdateAssignmentDto })
  @ApiResponse({
    status: 200,
    description: 'Assignment updated successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete assignment',
    description:
      'Deletes an assignment and all associated submissions. ' +
      'This action is irreversible.',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: 204, description: 'Assignment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    await this.assignmentsService.remove(id);
  }

  @Post(':id/submissions')
  @Roles('student')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit assignment',
    description:
      "Submits a student's work for an assignment. " +
      'Supports both text content and file upload. ' +
      'File is uploaded to MinIO storage and a URL is stored with the submission. ' +
      'Each student can only submit once per assignment (use PATCH to update).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Text content of the submission',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'File attachment',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Assignment submitted successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiResponse({
    status: 409,
    description: 'Already submitted — use PATCH to resubmit',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submit(
    @Param('id') id: string,
    @Body('content') content: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentsService.submit(id, user.id, content, file);
  }

  @Get(':id/submissions')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all submissions for an assignment',
    description:
      'Returns all student submissions for an assignment. ' +
      'Shows student ID, content, file URL, grade, and feedback. ' +
      'Use this to review and grade student work.',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({
    status: 200,
    description: 'Submissions retrieved successfully',
    type: SubmissionListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findSubmissions(@Param('id') id: string) {
    return this.assignmentsService.findSubmissions(id);
  }

  @Get(':id/submissions/:studentId')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific submission',
    description:
      "Returns a single student's submission for an assignment. " +
      'Shows content, file URL, grade, and feedback.',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Submission retrieved successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findSubmission(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.assignmentsService.findSubmission(id, studentId);
  }

  @Patch(':assignmentId/submissions/:studentId/grade')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grade a submission',
    description:
      "Grades a student's submission with a score and optional feedback. " +
      'Grade should be on the same scale as the assignment (e.g., out of 20). ' +
      'Feedback is visible to the student.',
  })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiBody({ type: GradeSubmissionDto })
  @ApiResponse({
    status: 200,
    description: 'Submission graded successfully',
    type: SubmissionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async grade(
    @Param('assignmentId') assignmentId: string,
    @Param('studentId') studentId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.assignmentsService.grade(assignmentId, studentId, dto);
  }
}
