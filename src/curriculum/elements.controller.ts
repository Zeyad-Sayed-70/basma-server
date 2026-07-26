import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Header,
  Res,
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
  ApiExtraModels,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionGuard } from '../auth/guards/session.guard';
import { StreamAuthGuard } from './stream-auth.guard';
import { StreamRateGuard } from './stream-rate.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ElementsService } from './elements.service';
import { CoursesService } from '../courses/courses.service';
import { CreateVideoElementDto } from './dto/create-video-element.dto';
import { CreateFileElementDto } from './dto/create-file-element.dto';
import { CreateRichContentDto } from './dto/create-rich-content.dto';
import { UpdateElementDto } from './dto/update-element.dto';
import { ReorderDto } from './dto/reorder.dto';
import { SignStreamDto } from './dto/sign-stream.dto';
import { ElementResponseDto } from './dto/element-response.dto';
import {
  videoDiskStorage,
  videoFileFilter,
  MAX_VIDEO_SIZE_BYTES,
} from '../common/uploads/video-upload.config';
import { VideoJobResponseDto } from '../youtube/dto/job-response.dto';
import {
  StreamBundleResponseDto,
  VideoQualityDto,
} from '../youtube/dto/stream-bundle.dto';

@ApiTags('Curriculum')
@ApiBearerAuth()
@UseGuards(RolesGuard, SessionGuard)
@Controller()
export class ElementsController {
  constructor(
    private readonly elementsService: ElementsService,
    private readonly coursesService: CoursesService,
  ) {}

  @Post('curriculum/:id/elements/video')
  @Roles('teacher')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: videoDiskStorage,
      fileFilter: videoFileFilter,
      limits: { fileSize: MAX_VIDEO_SIZE_BYTES },
    }),
  )
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Upload video (async)',
    description:
      'Uploads a video file and starts asynchronous processing. ' +
      'Returns 202 with element and job status. ' +
      'Poll GET /api/elements/:id/job for job status. ' +
      'Accepted formats: mp4, webm, ogg, mov, avi, mkv.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Curriculum ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Video file' },
        title: { type: 'string', description: 'Element title' },
        description: { type: 'string', description: 'Video description' },
        durationSeconds: {
          type: 'integer',
          description: 'Duration in seconds',
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Video upload started',
    schema: {
      type: 'object',
      properties: {
        element: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx...' },
            curriculumId: { type: 'string', example: 'clx...' },
            type: { type: 'string', example: 'VIDEO' },
            title: { type: 'string', example: 'Introduction' },
            position: { type: 'integer', example: 1000 },
            required: { type: 'boolean', example: true },
            video: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'clx...' },
                title: { type: 'string', example: 'Introduction Video' },
                videoUrl: {
                  type: 'string',
                  example: 'https://minio.example.com/...',
                },
                mimeType: { type: 'string', example: 'video/mp4' },
                fileSize: { type: 'integer', example: 52428800 },
                durationSeconds: { type: 'integer', example: 300 },
              },
            },
          },
        },
        job: { $ref: '#/components/schemas/VideoJobResponseDto' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request — invalid file or missing data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({ status: 404, description: 'Curriculum not found' })
  @ApiResponse({ status: 413, description: 'File too large' })
  async addVideo(
    @Param('id') id: string,
    @Body() dto: CreateVideoElementDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.elementsService.addVideo(
      id,
      dto,
      file.path,
      file.originalname,
      file.mimetype,
      file.size,
    );
  }

  @Get('elements/:id/job')
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get video upload job status',
    description:
      'Returns the current job status for a video element. Poll this endpoint to track upload progress.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiResponse({
    status: 200,
    description: 'Job status',
    type: VideoJobResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(@Param('id') id: string) {
    return this.elementsService.getJob(id);
  }

  @Post('elements/:id/job/retry')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry failed upload job',
    description: 'Re-enqueues a failed video upload job.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiResponse({
    status: 200,
    description: 'Job retry initiated',
    type: VideoJobResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Job is not in FAILED state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retryJob(@Param('id') id: string) {
    return this.elementsService.retryJob(id);
  }

  @Post('elements/:id/stream')
  @UseGuards(StreamAuthGuard)
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiExtraModels(StreamBundleResponseDto, VideoQualityDto)
  @ApiOperation({
    summary: 'Get video stream bundle',
    description:
      'Returns a bundle of direct stream URLs for all video qualities. ' +
      'If bundle is expired, returns kind=preparing to trigger regeneration. ' +
      'If still uploading, returns kind=uploading. ' +
      'Student must be enrolled in the course.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiResponse({
    status: 200,
    description: 'Stream bundle or status',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            kind: { type: 'string', example: 'bundle' },
            bundle: { $ref: '#/components/schemas/StreamBundleResponseDto' },
          },
        },
        {
          type: 'object',
          properties: {
            kind: { type: 'string', example: 'preparing' },
          },
        },
        {
          type: 'object',
          properties: {
            kind: { type: 'string', example: 'uploading' },
          },
        },
        {
          type: 'object',
          properties: {
            kind: { type: 'string', example: 'failed' },
            error: { type: 'string' },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  async getStream(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.elementsService.getStream(id, user?.id, user?.role);
  }

  @Post('elements/:id/stream/sign')
  @UseGuards(StreamAuthGuard)
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get signed stream URL',
    description:
      'Returns a short-lived signed URL for the video or audio track. ' +
      'The URL expires in 30 seconds and must be refreshed. ' +
      'The signed token is in the query param, not the Authorization header. ' +
      'This prevents the auth token from being exposed in the video element src.',
  })
  @ApiResponse({ status: 200, description: 'Signed stream URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  @ApiResponse({ status: 404, description: 'Quality or track not found' })
  @UseGuards(StreamRateGuard)
  async signStream(
    @Param('id') id: string,
    @Body() dto: SignStreamDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.elementsService.signStream(
      id,
      dto.quality,
      dto.track,
      dto.container,
      user?.id,
      user?.role,
    );
  }

  @Get('elements/:id/stream/:quality/:track')
  @UseGuards(StreamAuthGuard)
  @Roles('teacher', 'student')
  @HttpCode(HttpStatus.OK)
  @Header('Accept-Ranges', 'bytes')
  @ApiOperation({
    summary: 'Proxy video/audio stream',
    description:
      'Proxies the video or audio track for a given quality. ' +
      'Supports Range headers for seeking. ' +
      'The actual CDN URL is never exposed to the client.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiParam({ name: 'quality', description: 'Quality label e.g. 720p' })
  @ApiParam({ name: 'track', description: 'Track type: video or audio' })
  @ApiQuery({
    name: 'container',
    required: false,
    description:
      'Container format (mp4, webm) — defaults to preferredContainer',
  })
  @ApiResponse({ status: 200, description: 'Media stream' })
  @ApiResponse({ status: 206, description: 'Partial content (Range request)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  @ApiResponse({ status: 404, description: 'Quality or track not found' })
  async streamMedia(
    @Param('id') id: string,
    @Param('quality') quality: string,
    @Param('track') track: string,
    @Query('container') container: string | undefined,
    @CurrentUser() user?: AuthenticatedUser,
    @Res() res?: any,
  ) {
    return this.elementsService.streamMedia(
      id,
      quality,
      track,
      container,
      user?.id,
      user?.role,
      res,
    );
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
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
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
  @ApiResponse({
    status: 400,
    description: 'Bad request — file missing or invalid',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
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
  @ApiResponse({
    status: 400,
    description: 'Bad request — invalid content structure',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Assignment or curriculum not found',
  })
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
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
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, png, gif, webp)',
        },
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
        fileUrl: {
          type: 'string',
          example: 'https://minio.example.com/curriculum/images/.../image.png',
        },
        fileObjectKey: {
          type: 'string',
          example: 'curriculum/images/demo/clx.../image.png',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request — file missing' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
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
  @ApiResponse({
    status: 400,
    description: 'Bad request — ID count mismatch or invalid IDs',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
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
  @ApiResponse({
    status: 400,
    description: 'Bad request — invalid content structure',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({ status: 404, description: 'Element not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateElementDto) {
    return this.elementsService.update(id, dto);
  }

  @Patch('elements/:id/replace-video')
  @Roles('teacher')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: videoDiskStorage,
      fileFilter: videoFileFilter,
      limits: { fileSize: MAX_VIDEO_SIZE_BYTES },
    }),
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replace video file',
    description:
      'Uploads a new video file to replace the existing one. ' +
      'The old file is deleted from storage. The previous YouTube video is orphaned. ' +
      'A new upload job is started. Poll GET /api/elements/:id/job for progress.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Element ID (must be VIDEO type)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'New video file',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Video replacement started',
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clx...' },
            title: { type: 'string', example: 'Introduction Video' },
            videoUrl: {
              type: 'string',
              example: 'https://minio.example.com/...',
            },
            mimeType: { type: 'string', example: 'video/mp4' },
            fileSize: { type: 'integer', example: 52428800 },
          },
        },
        job: { $ref: '#/components/schemas/VideoJobResponseDto' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request — file missing' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({ status: 404, description: 'Video element not found' })
  @ApiResponse({ status: 413, description: 'File too large' })
  async replaceVideo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.elementsService.replaceVideo(
      id,
      file.path,
      file.originalname,
      file.mimetype,
      file.size,
    );
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
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
      'the associated file is also removed from storage. ' +
      'Any in-flight upload job is cancelled. YouTube video is orphaned.',
  })
  @ApiParam({ name: 'id', description: 'Element ID' })
  @ApiResponse({ status: 204, description: 'Element deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — teacher role required',
  })
  @ApiResponse({ status: 404, description: 'Element not found' })
  async remove(@Param('id') id: string) {
    await this.elementsService.remove(id);
  }
}
