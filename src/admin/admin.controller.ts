import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Render,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { TierFeatureService } from '../common/services/tier-feature.service';
import {
  TIER_DISPLAY_NAMES,
  TIER_ORDER,
  TIER_LIMITS,
  TIER_FEATURES,
  TIER_PRICING,
} from '../common/constants/tier-limits';
import { Tier } from '@prisma/client';
import type { Request, Response } from 'express';

@Controller()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

  @Post('api/admin/login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminService.login(body.email, body.password);
    res.cookie('admin_token', result.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return result;
  }

  @Post('api/admin/logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('admin_token', { path: '/' });
    return { message: 'Logged out' };
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('api/admin/me')
  async me(@Req() req: Request) {
    return this.adminService.getProfile((req.user as { id: string }).id);
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('api/admin/instances')
  async listInstances(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listInstances(
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('api/admin/instances/:id')
  async getInstance(@Param('id') id: string) {
    return this.adminService.getInstanceDetail(id);
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('api/admin/instances/:id/usage')
  async getInstanceUsage(@Param('id') id: string) {
    return this.adminService.getInstanceUsage(id);
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('api/admin/instances/:id/logs')
  async getInstanceLogs(@Param('id') id: string) {
    return this.adminService.getTierLogs(id);
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Patch('api/admin/instances/:id/tier')
  async changeTier(
    @Param('id') id: string,
    @Body()
    body: {
      tier: Tier;
      periodMonths?: number;
      amountPaid?: number;
      notes?: string;
    },
    @Req() req: Request,
  ) {
    return this.adminService.changeTier(
      id,
      body.tier,
      body.periodMonths ?? null,
      body.amountPaid ?? null,
      (req.user as { id: string }).id,
    );
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Post('api/admin/instances/:id/renew')
  async renewPlan(
    @Param('id') id: string,
    @Body() body: { periodMonths: number; amountPaid?: number },
    @Req() req: Request,
  ) {
    return this.adminService.renewPlan(
      id,
      body.periodMonths,
      body.amountPaid ?? null,
      (req.user as { id: string }).id,
    );
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('api/admin/stats')
  async getStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('admin/login')
  @Render('login')
  loginPage() {
    return {};
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('admin')
  @Render('dashboard')
  async dashboardPage() {
    const stats = await this.adminService.getPlatformStats();
    return { stats };
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('admin/instances')
  @Render('instances')
  async instancesPage(
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    const result = await this.adminService.listInstances(
      search,
      page ? parseInt(page, 10) : 1,
      50,
    );
    return {
      instances: result.data,
      total: result.total,
      page: result.page,
      search,
    };
  }

  @UseGuards(AuthGuard('admin-jwt'), AdminGuard)
  @Get('admin/instances/:id')
  @Render('instance-detail')
  async instanceDetailPage(@Param('id') id: string) {
    const instance = await this.adminService.getInstanceDetail(id);
    const usage = await this.adminService.getInstanceUsage(id);
    const logs = await this.adminService.getTierLogs(id);
    return {
      instance,
      usage,
      logs,
      tiers: TIER_ORDER,
      tierDisplayNames: TIER_DISPLAY_NAMES,
      tierLimits: TIER_LIMITS,
      tierFeatures: TIER_FEATURES,
      tierPricing: TIER_PRICING,
    };
  }
}
