import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CurriculumService } from './curriculum.service';
import { ElementsService } from './elements.service';
import { CoursesService } from '../courses/courses.service';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';
import { CurriculumResponseDto } from './dto/curriculum-response.dto';

@ApiTags('Curriculum')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class CurriculumController {
  constructor(
    private readonly curriculumService: CurriculumService,
    private readonly elementsService: ElementsService,
    private readonly coursesService: CoursesService,
  ) {}

  @Post('courses/:courseId/curriculum')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or get curriculum for a course',
    description:
      'Creates a curriculum for a course. Idempotent — returns existing if already created.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiBody({ type: CreateCurriculumDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Curriculum created or already exists',
    type: CurriculumResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async create(
    @Param('courseId') courseId: string,
    @Body() dto?: CreateCurriculumDto,
  ) {
    return this.curriculumService.create(courseId, dto);
  }

  @Get('courses/:courseId/curriculum')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get curriculum with all elements',
    description:
      'Returns the full curriculum for a course with all elements ordered by position. ' +
      'For students, includes per-element progress and course-level progress.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum retrieved',
    type: CurriculumResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findByCourse(
    @Param('courseId') courseId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user?.role === 'student') {
      await this.coursesService.assertStudentEnrolled(courseId, user.id);
    }

    const studentId = user?.role === 'student' ? user.id : undefined;
    const curriculum = await this.curriculumService.findByCourse(
      courseId,
      studentId,
    );
    return { data: curriculum };
  }

  @Patch('curriculum/:id')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update curriculum metadata' })
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiBody({ type: UpdateCurriculumDto })
  @ApiResponse({
    status: 200,
    description: 'Curriculum updated',
    type: CurriculumResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateCurriculumDto) {
    return this.curriculumService.update(id, dto);
  }

  @Delete('curriculum/:id')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete curriculum and all elements' })
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiResponse({ status: 204, description: 'Curriculum deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  async remove(@Param('id') id: string) {
    await this.curriculumService.remove(id);
  }
}
