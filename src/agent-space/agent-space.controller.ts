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
import { AgentSpaceService } from './agent-space.service';
import {
  UploadSpaceFileDto,
  UpdateSpaceFileDto,
  SearchSpaceDto,
} from './dto/upload-space-file.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Agent Space')
@Controller('agent-space')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AgentSpaceController {
  constructor(private readonly agentSpaceService: AgentSpaceService) {}

  @Get('files')
  @Roles('teacher')
  @ApiOperation({ summary: 'List files in teacher agent space' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listFiles(
    @CurrentUser('instanceId') instanceId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.agentSpaceService.listFiles(instanceId, limit, offset);
  }

  @Get('files/:id')
  @Roles('teacher')
  @ApiOperation({ summary: 'Get a space file with content' })
  async getFile(
    @CurrentUser('instanceId') instanceId: string,
    @Param('id') id: string,
  ) {
    return this.agentSpaceService.getFile(instanceId, id);
  }

  @Post('files')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload a .md or .txt file to space' })
  async uploadFile(
    @CurrentUser('instanceId') instanceId: string,
    @Body() dto: UploadSpaceFileDto,
  ) {
    return this.agentSpaceService.createFile(
      instanceId,
      dto.filename,
      dto.content,
      dto.fileType ?? 'md',
    );
  }

  @Patch('files/:id')
  @Roles('teacher')
  @ApiOperation({ summary: 'Update file content' })
  async updateFile(
    @CurrentUser('instanceId') instanceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpaceFileDto,
  ) {
    return this.agentSpaceService.updateFile(instanceId, id, dto.content);
  }

  @Delete('files/:id')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a space file' })
  async deleteFile(
    @CurrentUser('instanceId') instanceId: string,
    @Param('id') id: string,
  ) {
    await this.agentSpaceService.deleteFile(instanceId, id);
  }

  @Get('search')
  @Roles('teacher')
  @ApiOperation({ summary: 'Full-text search across space files' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchContent(
    @CurrentUser('instanceId') instanceId: string,
    @Query() dto: SearchSpaceDto,
  ) {
    return this.agentSpaceService.searchContent(
      instanceId,
      dto.q,
      dto.limit ?? 20,
    );
  }
}
