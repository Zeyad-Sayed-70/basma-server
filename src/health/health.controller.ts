import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check server and database health' })
  @ApiResponse({
    status: 200,
    description: 'Server is healthy and database is connected',
    schema: {
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'connected' },
        timestamp: { type: 'string', example: '2026-06-25T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Database is disconnected or server is unhealthy',
    schema: {
      properties: {
        status: { type: 'string', example: 'error' },
        database: { type: 'string', example: 'disconnected' },
        timestamp: { type: 'string', example: '2026-06-25T00:00:00.000Z' },
      },
    },
  })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
