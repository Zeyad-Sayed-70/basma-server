import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LandingService } from './landing.service';
import { LandingPublicResponseDto } from './dto/landing-public-response.dto';

@ApiTags('Landing (Public)')
@Controller('landing/public')
export class LandingPublicController {
  constructor(private readonly landingService: LandingService) {}

  @Get('by-subdomain/:subdomain')
  @ApiOperation({
    summary: 'Get public landing page by subdomain',
    description:
      "Returns combined brand, landing content, and public courses for anonymous visitors. Used to render the teacher's public landing page.",
  })
  @ApiParam({
    name: 'subdomain',
    example: 'myschool',
    description: 'Instance subdomain',
  })
  @ApiResponse({
    status: 200,
    description: 'Public landing page info retrieved',
    type: LandingPublicResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Instance or landing page not found',
  })
  async findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.landingService.findPublicBySubdomain(subdomain);
  }

  @Get('by-domain/:domain')
  @ApiOperation({
    summary: 'Get public landing page by custom domain',
    description:
      'Returns the same combined response as subdomain lookup, but resolved by the custom domain set in brand settings.',
  })
  @ApiParam({
    name: 'domain',
    example: 'myschool.example.com',
    description: 'Custom domain',
  })
  @ApiResponse({
    status: 200,
    description: 'Public landing page info retrieved',
    type: LandingPublicResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Instance or landing page not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Domain not verified (if verification is implemented)',
  })
  async findByDomain(@Param('domain') domain: string) {
    return this.landingService.findPublicByDomain(domain);
  }
}
