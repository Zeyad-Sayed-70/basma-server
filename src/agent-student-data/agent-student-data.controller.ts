import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AgentStudentDataService } from './agent-student-data.service';
import { CreateNoteDto, UpdateProfileDto } from './dto/create-note.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Agent Student Data')
@Controller('agent-student-data')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AgentStudentDataController {
  constructor(
    private readonly agentStudentDataService: AgentStudentDataService,
  ) {}

  @Get(':studentId/notes')
  @Roles('teacher')
  @ApiOperation({ summary: 'Get agent notes for a student' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getNotes(
    @CurrentUser('instanceId') instanceId: string,
    @Param('studentId') studentId: string,
    @Query('category') category?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.agentStudentDataService.getNotes(
      instanceId,
      studentId,
      category,
      limit,
    );
  }

  @Post('notes')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an agent note about a student' })
  async addNote(
    @CurrentUser('instanceId') instanceId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.agentStudentDataService.addNote(
      instanceId,
      dto.studentId,
      dto.category ?? 'general',
      dto.content,
      dto.source ?? 'teacher',
      dto.sessionId,
    );
  }

  @Get(':studentId/profile')
  @Roles('teacher')
  @ApiOperation({ summary: 'Get synthesized agent profile for student' })
  async getProfile(@Param('studentId') studentId: string) {
    return this.agentStudentDataService.getProfile(studentId);
  }

  @Patch(':studentId/profile')
  @Roles('teacher')
  @ApiOperation({ summary: 'Update synthesized agent profile for student' })
  async updateProfile(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    await this.agentStudentDataService.updateProfile(studentId, dto.profile);
    return { success: true };
  }

  @Get(':studentId/memory')
  @Roles('teacher')
  @ApiOperation({ summary: 'Get student memory (profile + recent notes)' })
  async getStudentMemory(
    @CurrentUser('instanceId') instanceId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.agentStudentDataService.getStudentMemory(instanceId, studentId);
  }
}
