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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  SessionResponseDto,
  SessionListResponseDto,
} from './dto/session-response.dto';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new session',
    description:
      'Creates a session within a course. ' +
      'Supports both LOCAL (in-person) and ONLINE (virtual) session types. ' +
      'For LOCAL sessions, provide a location. For ONLINE sessions, provide platform and meetingUrl. ' +
      'Session creation triggers a notification event (handled by the notification system).',
  })
  @ApiBody({ type: CreateSessionDto })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Get()
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all sessions',
    description:
      "Returns all sessions for the authenticated teacher's instance. " +
      'Optionally filter by courseId, date range (from/to). ' +
      'Sessions are sorted by start time ascending.',
  })
  @ApiQuery({
    name: 'courseId',
    required: false,
    description: 'Filter by course ID',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Filter sessions starting from this date (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Filter sessions starting until this date (ISO 8601)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    type: SessionListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('courseId') courseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.sessionsService.findAll(courseId, from, to, user);
  }

  @Get(':id')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get session by ID',
    description:
      'Returns a single session with full details including type-specific fields ' +
      '(location for LOCAL, platform/meetingUrl for ONLINE).',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session retrieved successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.sessionsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update session',
    description:
      'Updates session details including title, time, type, and type-specific fields. ' +
      'Can change a session from LOCAL to ONLINE or vice versa. ' +
      'Only fields provided in the request body will be updated.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiBody({ type: UpdateSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Session updated successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete session',
    description:
      'Deletes a session. This action is irreversible. ' +
      'Does not delete the associated course or any other data.',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 204, description: 'Session deleted successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    await this.sessionsService.remove(id);
  }
}
