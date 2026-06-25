import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { BrandPublicResponseDto } from './dto/brand-public-response.dto';

@ApiTags('Brand (Public)')
@Controller('brand/public')
export class BrandPublicController {
  constructor(private readonly brandService: BrandService) {}

  @Get(':subdomain')
  @ApiOperation({
    summary: 'Get public brand info by subdomain',
    description:
      "Returns public brand settings (logo, colors, font) for anonymous visitors. Used to render the teacher's public-facing site.",
  })
  @ApiParam({
    name: 'subdomain',
    example: 'myschool',
    description: 'Instance subdomain',
  })
  @ApiResponse({
    status: 200,
    description: 'Public brand info retrieved successfully',
    type: BrandPublicResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.brandService.findBySubdomain(subdomain);
  }
}
