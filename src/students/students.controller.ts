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
  Res,
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
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import {
  StudentResponseDto,
  StudentListResponseDto,
} from './dto/student-response.dto';
import {
  BulkImportDto,
  BulkImportResultDto,
  RedeemInvitationDto,
} from './dto/bulk-import.dto';

@ApiTags('Students')
@Roles('teacher')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new student',
    description:
      "Adds a student to a group within the teacher's instance. " +
      'If the instance has reached its tier student limit, the student is created as INACTIVE. ' +
      'Email is unique within the instance.',
  })
  @ApiBody({ type: CreateStudentDto })
  @ApiResponse({
    status: 201,
    description: 'Student created successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({
    status: 409,
    description: 'Email already exists in this instance',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all students',
    description:
      "Returns all students in the teacher's instance. " +
      'Optionally filter by groupId. ' +
      'Includes active/inactive counts and tier student limit.',
  })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'Filter by group ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Students retrieved successfully',
    type: StudentListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Query('groupId') groupId?: string) {
    return this.studentsService.findAll(groupId);
  }

  @Get('export')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Export students as CSV',
    description:
      'Downloads all students (optionally filtered by group) as a CSV file. ' +
      'Columns: name, email, phone, status, groupId, createdAt.',
  })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'Filter by group ID',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file download',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example:
            'name,email,phone,status,groupId,createdAt\n"علي أحمد","ali@example.com","+201234567890",ACTIVE,clx...,2025-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportCsv(
    @Query('groupId') groupId: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.studentsService.exportCsv(groupId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=students-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    res.send(csv);
  }

  @Post('import')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk import students',
    description:
      'Imports multiple students into a group in one request. ' +
      'Students beyond the tier limit are created as INACTIVE. ' +
      'Duplicate emails within the instance are skipped.',
  })
  @ApiBody({ type: BulkImportDto })
  @ApiResponse({
    status: 201,
    description: 'Import completed',
    type: BulkImportResultDto,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkImport(@Body() dto: BulkImportDto) {
    return this.studentsService.bulkImport(dto);
  }

  @Post('redeem-invitation')
  @Roles()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Redeem invitation code',
    description:
      'Allows a student to join a group using an invitation code. ' +
      'No authentication required — this is a public endpoint. ' +
      'The group must be in CLOSED registration mode. ' +
      'Students beyond the tier limit are created as INACTIVE.',
  })
  @ApiBody({ type: RedeemInvitationDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined the group',
    schema: {
      properties: {
        id: { type: 'string', example: 'clx...' },
        name: { type: 'string', example: 'علي أحمد' },
        email: { type: 'string', example: 'ali@example.com' },
        phone: { type: 'string', example: '+201234567890' },
        status: { type: 'string', example: 'ACTIVE' },
        groupId: { type: 'string', example: 'clx...' },
        createdAt: { type: 'string', example: '2025-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid or expired invitation code',
  })
  @ApiResponse({ status: 400, description: 'Group is not in CLOSED mode' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async redeemInvitation(@Body() dto: RedeemInvitationDto) {
    return this.studentsService.redeemInvitation(dto);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get student by ID',
    description: "Returns a single student's details.",
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({
    status: 200,
    description: 'Student retrieved successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update student',
    description:
      'Updates student name, email, phone, status, or group assignment. ' +
      'Email must remain unique within the instance. ' +
      'Can move a student to a different group within the same instance.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiBody({ type: UpdateStudentDto })
  @ApiResponse({
    status: 200,
    description: 'Student updated successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Student or target group not found',
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete student',
    description:
      'Removes a student and all associated data (enrollments, quiz attempts, assignment submissions, payments). ' +
      'This action is irreversible.',
  })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiResponse({ status: 204, description: 'Student deleted successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    await this.studentsService.remove(id);
  }
}
