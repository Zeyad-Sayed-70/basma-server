import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateNotificationDto,
  SendAnnouncementDto,
  UpdateNotificationPreferenceDto,
  ConnectWhatsAppDto,
} from './dto/index';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  @Post()
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a notification manually' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List notifications' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by notification type',
    enum: ['SESSION_REMINDER', 'QUIZ_GRADED', 'ASSIGNMENT_DUE', 'CUSTOM'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by delivery status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-indexed)',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (max 100)',
    example: '50',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAll(
      type,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('stats')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get notification delivery stats' })
  @ApiResponse({
    status: 200,
    description: 'Notification delivery statistics',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStats() {
    return this.notificationsService.getStats();
  }

  @Get('preferences')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getPreferences() {
    return this.notificationsService.getPreferences();
  }

  @Patch('preferences/:type')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preference' })
  @ApiParam({
    name: 'type',
    description: 'Notification type to update preference for',
    enum: ['SESSION_REMINDER', 'QUIZ_GRADED', 'ASSIGNMENT_DUE', 'CUSTOM'],
  })
  @ApiBody({ type: UpdateNotificationPreferenceDto })
  @ApiResponse({
    status: 200,
    description: 'Notification preference updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updatePreference(
    @Param('type') type: string,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(type, dto);
  }

  @Post('announce')
  @Roles('teacher')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send announcement to groups' })
  @ApiBody({ type: SendAnnouncementDto })
  @ApiResponse({
    status: 201,
    description: 'Announcement sent successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  sendAnnouncement(@Body() dto: SendAnnouncementDto) {
    return this.notificationsService.sendAnnouncement(dto);
  }

  @Post('whatsapp/connect')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connect WhatsApp number (QR or pairing code)',
    description:
      'Initiates a WhatsApp WebJS connection. ' +
      'Use method=qr to get a QR code (scan with WhatsApp mobile app). ' +
      'Use method=pairing with a phone number for code-based pairing. ' +
      'After connecting, check GET /whatsapp/status for connection state.',
  })
  @ApiBody({ type: ConnectWhatsAppDto })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp connection initiated',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid method or missing phone number',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async connectWhatsApp(
    @Body() dto: ConnectWhatsAppDto,
    @CurrentUser() user: { instanceId: string },
  ) {
    return this.whatsAppService.connectSocket(
      user.instanceId,
      dto.method === 'pairing' ? dto.phoneNumber : undefined,
    );
  }

  @Get('whatsapp/status')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get WhatsApp connection status' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp connection status retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getWhatsAppStatus(@CurrentUser() user: { instanceId: string }) {
    return this.whatsAppService.getStatus(user.instanceId);
  }

  @Get('whatsapp/qr')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current QR code data URL' })
  @ApiResponse({
    status: 200,
    description: 'QR code data URL (null if not available)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getQR(@CurrentUser() user: { instanceId: string }) {
    const qr = this.whatsAppService.getCurrentQR(user.instanceId);
    if (!qr) {
      return { qr: null, message: 'No QR available. Connect first.' };
    }
    return { qr };
  }

  @Delete('whatsapp/disconnect')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect WhatsApp' })
  @ApiResponse({
    status: 200,
    description: 'WhatsApp disconnected successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async disconnectWhatsApp(@CurrentUser() user: { instanceId: string }) {
    await this.whatsAppService.disconnect(user.instanceId);
    return { message: 'WhatsApp disconnected' };
  }

  @Get(':id')
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get notification details' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }
}
