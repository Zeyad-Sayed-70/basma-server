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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
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
  @ApiOperation({ summary: 'Create a notification manually' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @Roles('teacher')
  @ApiOperation({ summary: 'List notifications' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
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
  @ApiOperation({ summary: 'Get notification delivery stats' })
  getStats() {
    return this.notificationsService.getStats();
  }

  @Get('preferences')
  @Roles('teacher')
  @ApiOperation({ summary: 'Get notification preferences' })
  getPreferences() {
    return this.notificationsService.getPreferences();
  }

  @Patch('preferences/:type')
  @Roles('teacher')
  @ApiOperation({ summary: 'Update notification preference' })
  updatePreference(
    @Param('type') type: string,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(type, dto);
  }

  @Post('announce')
  @Roles('teacher')
  @ApiOperation({ summary: 'Send announcement to groups' })
  sendAnnouncement(@Body() dto: SendAnnouncementDto) {
    return this.notificationsService.sendAnnouncement(dto);
  }

  @Post('whatsapp/connect')
  @Roles('teacher')
  @ApiOperation({ summary: 'Connect WhatsApp number (QR or pairing code)' })
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
  @ApiOperation({ summary: 'Get WhatsApp connection status' })
  getWhatsAppStatus(@CurrentUser() user: { instanceId: string }) {
    return this.whatsAppService.getStatus(user.instanceId);
  }

  @Get('whatsapp/qr')
  @Roles('teacher')
  @ApiOperation({ summary: 'Get current QR code data URL' })
  getQR(@CurrentUser() user: { instanceId: string }) {
    const qr = this.whatsAppService.getCurrentQR(user.instanceId);
    if (!qr) {
      return { qr: null, message: 'No QR available. Connect first.' };
    }
    return { qr };
  }

  @Delete('whatsapp/disconnect')
  @Roles('teacher')
  @ApiOperation({ summary: 'Disconnect WhatsApp' })
  async disconnectWhatsApp(@CurrentUser() user: { instanceId: string }) {
    await this.whatsAppService.disconnect(user.instanceId);
    return { message: 'WhatsApp disconnected' };
  }

  @Get(':id')
  @Roles('teacher')
  @ApiOperation({ summary: 'Get notification details' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }
}
