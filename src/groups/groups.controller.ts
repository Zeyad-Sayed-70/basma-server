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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import {
  GroupResponseDto,
  GroupListResponseDto,
} from './dto/group-response.dto';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new group',
    description:
      "Creates a group scoped to the authenticated teacher's instance. " +
      'Enforces tier limits: FREE plan allows only 1 group. ' +
      'Group names must be unique within the instance.',
  })
  @ApiBody({ type: CreateGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Group name already exists' })
  @ApiResponse({ status: 403, description: 'Tier limit exceeded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Get()
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all groups',
    description:
      "Returns all groups for the authenticated teacher's instance, " +
      'including active/inactive student counts and current tier limits.',
  })
  @ApiResponse({
    status: 200,
    description: 'Groups retrieved successfully',
    type: GroupListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get group by ID',
    description: 'Returns a single group with student counts.',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update group',
    description:
      'Updates group name, description, or registration mode. ' +
      'Group names must remain unique within the instance.',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiBody({ type: UpdateGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 409, description: 'Group name already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete group',
    description:
      'Deletes a group and all its associated data (students, courses, sessions, quizzes, assignments, chat messages). ' +
      'This action is irreversible.',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({ status: 204, description: 'Group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async remove(@Param('id') id: string) {
    await this.groupsService.remove(id);
  }

  @Post(':id/invitation-code')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate invitation code',
    description:
      'Generates a new unique invitation code for the group. ' +
      'When registration mode is CLOSED, students can only join using this code. ' +
      'Generating a new code invalidates the previous one.',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation code generated',
    schema: {
      properties: {
        id: { type: 'string', example: 'clx...' },
        name: { type: 'string', example: 'الصف الأول الثانوي' },
        invitationCode: { type: 'string', example: 'a1b2c3d4e5f6' },
        registrationMode: { type: 'string', example: 'CLOSED' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateInvitationCode(@Param('id') id: string) {
    return this.groupsService.generateInvitationCode(id);
  }

  @Delete(':id/invitation-code')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke invitation code',
    description:
      'Removes the invitation code from the group, preventing new students from joining via invitation link.',
  })
  @ApiParam({ name: 'id', description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation code revoked',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeInvitationCode(@Param('id') id: string) {
    return this.groupsService.revokeInvitationCode(id);
  }
}
