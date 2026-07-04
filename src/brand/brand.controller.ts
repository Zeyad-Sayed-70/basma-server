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
import { DomainStatusResponseDto } from './dto/domain-status-response.dto';
import { DomainVerifyResponseDto } from './dto/domain-verify-response.dto';

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
      'Updates brand colors, font family, custom domain, or white-label toggle. Setting a custom domain generates a verification token and resets verification state.',
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

  @Post('domain/verify')
  @ApiOperation({
    summary: 'Verify custom domain ownership via DNS TXT record',
    description:
      'Checks that the TXT record "_basma.<domain>" contains the verification token. On success, marks the domain as verified. Returns immediately with the result.',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain verified successfully',
    type: DomainVerifyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'DNS verification failed or no domain configured',
  })
  async verifyDomain() {
    return this.brandService.verifyDomain();
  }

  @Get('domain/status')
  @ApiOperation({
    summary: 'Get custom domain verification status',
    description:
      'Returns the current custom domain, verification state, DNS instructions, and verification token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain status retrieved',
    type: DomainStatusResponseDto,
  })
  async getDomainStatus() {
    return this.brandService.getDomainStatus();
  }

  @Delete('domain')
  @ApiOperation({
    summary: 'Remove custom domain',
    description:
      'Removes the custom domain and resets verification state. The instance will fall back to its subdomain. After removal, the previous custom domain becomes available for other instances to claim.',
  })
  @ApiResponse({
    status: 200,
    description: 'Custom domain removed',
    type: BrandResponseDto,
  })
  async removeDomain() {
    return this.brandService.removeDomain();
  }
}
