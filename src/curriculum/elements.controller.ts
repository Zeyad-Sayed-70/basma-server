import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ElementsService } from './elements.service';
import { CreateVideoElementDto } from './dto/create-video-element.dto';
import { CreateFileElementDto } from './dto/create-file-element.dto';
import { CreateRichContentDto } from './dto/create-rich-content.dto';
import { UpdateElementDto } from './dto/update-element.dto';
import { ReorderDto } from './dto/reorder.dto';
import { ElementResponseDto } from './dto/element-response.dto';

@ApiTags('Curriculum')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class ElementsController {
  constructor(private readonly elementsService: ElementsService) {}

  @Post('curriculum/:id/elements/video')
  @Roles('teacher')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add video element',
    description:
      'Uploads a video file and creates a VIDEO curriculum element. ' +
      'Accepted formats: mp4, webm, etc. Max file size is configurable.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Video file (mp4, webm, etc.)' },
        title: { type: 'string', description: 'Element title' },
        description: { type: 'string', description: 'Video description' },
        durationSeconds: { type: 'integer', description: 'Duration in seconds' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Video element created',
    type: ElementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request — file missing or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  async addVideo(
    @Param('id') id: string,
    @Body() dto: CreateVideoElementDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.elementsService.addVideo(id, dto, file);
  }

  @Post('curriculum/:id/elements/file')
  @Roles('teacher')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add file element',
    description:
      'Uploads a file (PDF, DOCX, etc.) and creates a FILE curriculum element.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload' },
        title: { type: 'string', description: 'Element title' },
        description: { type: 'string', description: 'File description' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File element created',
    type: ElementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request — file missing or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  async addFile(
    @Param('id') id: string,
    @Body() dto: CreateFileElementDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.elementsService.addFile(id, dto, file);
  }

  @Post('curriculum/:id/elements/rich-content')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add rich content element',
    description:
      'Creates a RICH_CONTENT element with Tiptap-compatible JSON body. ' +
      'Only allowlisted node types are accepted (paragraph, heading, bulletList, orderedList, ' +
      'taskList, blockquote, codeBlock, horizontalRule, image, text).',
  })
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiBody({ type: CreateRichContentDto })
  @ApiResponse({
    status: 201,
    description: 'Rich content element created',
    type: ElementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request — invalid content structure' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  async addRichContent(
    @Param('id') id: string,
    @Body() dto: CreateRichContentDto,
  ) {
    return this.elementsService.addRichContent(id, dto);
  }

  @Post('curriculum/:id/elements/quiz/:quizId')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach existing quiz as curriculum element' })
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID to attach' })
  @ApiResponse({
    status: 201,
    description: 'Quiz attached as curriculum element',
    type: ElementResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Quiz or curriculum not found' })
  async attachQuiz(@Param('id') id: string, @Param('quizId') quizId: string) {
    return this.elementsService.attachQuiz(id, quizId);
  }

  @Post('curriculum/:id/elements/assignment/:assignmentId')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach existing assignment as curriculum element' })
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID to attach' })
  @ApiResponse({
    status: 201,
    description: 'Assignment attached as curriculum element',
    type: ElementResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Assignment or curriculum not found' })
  async attachAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.elementsService.attachAssignment(id, assignmentId);
  }

  @Post('curriculum/:id/elements/session/:sessionId')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach existing session as curriculum element' })
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to attach' })
  @ApiResponse({
    status: 201,
    description: 'Session attached as curriculum element',
    type: ElementResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Session or curriculum not found' })
  async attachSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.elementsService.attachSession(id, sessionId);
  }

  @Post('curriculum/:id/elements/upload-image')
  @Roles('teacher')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload image for rich content',
    description:
      "Uploads an image to the curriculum's image library. " +
      'Returns a URL that can be embedded in rich content bodyJson.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file (jpg, png, gif, webp)' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clx...' },
        fileUrl: { type: 'string', example: 'https://minio.example.com/curriculum/images/.../image.png' },
        fileObjectKey: { type: 'string', example: 'curriculum/images/demo/clx.../image.png' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request — file missing' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.elementsService.uploadImage(id, file);
  }

  @Post('curriculum/:id/reorder')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reorder curriculum elements',
    description:
      'Sets a new ordering for all elements in the curriculum. ' +
      'Provide all element IDs in the desired order. ' +
      'The count must match the total number of elements.',
  })
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiBody({ type: ReorderDto })
  @ApiResponse({ status: 200, description: 'Elements reordered' })
  @ApiResponse({ status: 400, description: 'Bad request — ID count mismatch or invalid IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  async reorder(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.elementsService.reorder(id, dto);
  }

  @Patch('elements/:id')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update element metadata',
    description:
      'Updates element properties like title, required flag, or type-specific fields. ' +
      'For RICH_CONTENT elements, bodyJson can be updated. ' +
      'For VIDEO elements, description can be updated. ' +
      'For FILE elements, fileDescription can be updated.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiBody({ type: UpdateElementDto })
  @ApiResponse({
    status: 200,
    description: 'Element updated',
    type: ElementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request — invalid content structure' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Element not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateElementDto) {
    return this.elementsService.update(id, dto);
  }

  @Patch('elements/:id/replace-video')
  @Roles('teacher')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replace video file',
    description:
      'Uploads a new video file to replace the existing one. ' +
      'The old file is deleted from storage. Returns updated video metadata.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Element ID (must be VIDEO type)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'New video file' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Video replaced',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        videoUrl: { type: 'string' },
        mimeType: { type: 'string' },
        fileSize: { type: 'integer' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request — file missing' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Video element not found' })
  async replaceVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.elementsService.replaceVideo(id, file);
  }

  @Patch('elements/:id/replace-file')
  @Roles('teacher')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replace file',
    description:
      'Uploads a new file to replace the existing one. ' +
      'The old file is deleted from storage. Returns updated file metadata.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Element ID (must be FILE type)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'New file' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File replaced',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        filename: { type: 'string' },
        fileUrl: { type: 'string' },
        mimeType: { type: 'string' },
        fileSize: { type: 'integer' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request — file missing' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'File element not found' })
  async replaceFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.elementsService.replaceFile(id, file);
  }

  @Delete('elements/:id')
  @Roles('teacher')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete element',
    description:
      'Deletes a curriculum element. If it is a VIDEO or FILE type, ' +
      'the associated file is also removed from storage.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiResponse({ status: 204, description: 'Element deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — teacher role required' })
  @ApiResponse({ status: 404, description: 'Element not found' })
  async remove(@Param('id') id: string) {
    await this.elementsService.remove(id);
  }
}
