import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
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
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandResponseDto } from './dto/brand-response.dto';

@ApiTags('Brand')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @ApiOperation({
    summary: 'Get brand settings',
    description:
      'Returns the brand configuration (colors, font, logo, white-label status) for the current instance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand settings retrieved successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async find() {
    return this.brandService.findBrand();
  }

  @Patch()
  @ApiOperation({
    summary: 'Update brand settings',
    description:
      'Updates brand colors, font family, custom domain, or white-label toggle. White-label requires a paid tier.',
  })
  @ApiResponse({
    status: 200,
    description: 'Brand updated successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'White-label not available on Free tier',
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async update(@Body() dto: UpdateBrandDto) {
    return this.brandService.update(dto);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload brand logo',
    description:
      'Uploads a logo image to MinIO storage and updates the brand logo URL.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Logo image file (png, jpg, svg)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Logo uploaded successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    return this.brandService.uploadLogo(file);
  }

  @Delete('logo')
  @ApiOperation({
    summary: 'Remove brand logo',
    description: 'Deletes the logo from MinIO storage and clears the logo URL.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logo removed successfully',
    type: BrandResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  async removeLogo() {
    return this.brandService.removeLogo();
  }
}
