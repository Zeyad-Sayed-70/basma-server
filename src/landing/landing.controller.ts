import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { LandingService } from './landing.service';
import { UpdateLandingDto } from './dto/update-landing.dto';
import { LandingResponseDto } from './dto/landing-response.dto';

@ApiTags('Landing')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Roles('teacher')
@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get()
  @ApiOperation({
    summary: 'Get or create landing page',
    description:
      'Returns the current landing page for the authenticated teacher. Creates a default one if none exists.',
  })
  @ApiResponse({
    status: 200,
    description: 'Landing page retrieved',
    type: LandingResponseDto,
  })
  async get() {
    return this.landingService.getOrCreateForCurrentInstance();
  }

  @Put()
  @ApiOperation({
    summary: 'Update landing page content',
    description:
      'Updates the landing page content, SEO fields, or locale. Validates referenced courses belong to the current instance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Landing page updated',
    type: LandingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  async update(@Body() dto: UpdateLandingDto) {
    return this.landingService.updateForCurrentInstance(dto);
  }

  @Post('publish')
  @ApiOperation({
    summary: 'Publish landing page',
    description:
      'Validates required fields and publishes the landing page. Returns validation errors if requirements are not met.',
  })
  @ApiResponse({
    status: 200,
    description: 'Landing page published',
    type: LandingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation errors prevent publishing',
  })
  async publish() {
    return this.landingService.publishForCurrentInstance();
  }

  @Post('unpublish')
  @ApiOperation({
    summary: 'Unpublish landing page',
    description: 'Sets landing page status back to draft.',
  })
  @ApiResponse({
    status: 200,
    description: 'Landing page unpublished',
    type: LandingResponseDto,
  })
  async unpublish() {
    return this.landingService.unpublishForCurrentInstance();
  }

  @Post('reset')
  @ApiOperation({
    summary: 'Reset landing page to defaults',
    description:
      'Resets all content, SEO fields, and status to default starter values.',
  })
  @ApiResponse({
    status: 200,
    description: 'Landing page reset',
    type: LandingResponseDto,
  })
  async reset() {
    return this.landingService.resetForCurrentInstance();
  }

  @Post('media')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload landing media',
    description:
      'Uploads an image file to MinIO storage for use in landing page sections. Returns the public URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, png, webp, svg) — max 5MB',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Media uploaded successfully',
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadMedia(@UploadedFile() file: Express.Multer.File) {
    return this.landingService.uploadMedia(file);
  }
}
