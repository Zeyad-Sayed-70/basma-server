import { Controller, Get, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Domain Check')
@Controller('domain-check')
export class DomainCheckController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Check if a custom domain is verified (for Caddy on_demand_tls)',
    description:
      'Returns 204 if the domain belongs to a verified brand. Returns 404 if not found or unverified.',
  })
  @ApiQuery({
    name: 'domain',
    required: true,
    example: 'myschool.com',
    description: 'The domain to check',
  })
  @ApiResponse({ status: 204, description: 'Domain is verified' })
  @ApiResponse({ status: 404, description: 'Domain not found or not verified' })
  async check(@Query('domain') domain: string) {
    const brand = await this.prisma.brand.findFirst({
      where: {
        customDomain: domain.toLowerCase(),
        customDomainVerifiedAt: { not: null },
      },
      select: { id: true },
    });

    if (!brand) {
      return null;
    }
  }
}
