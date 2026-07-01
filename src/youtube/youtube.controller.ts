import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { YoutubeService } from './youtube.service';
import { CookiesRefreshService } from './cookies.refresh.service';
import { ChannelStatusDto } from './dto/channel-status.dto';

@ApiTags('YouTube (Admin)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'teacher')
@Controller('youtube')
export class YoutubeController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly cookiesRefresh: CookiesRefreshService,
  ) {}

  @Get('channel')
  @ApiOperation({ summary: 'Get connected YouTube channel info' })
  async getChannel(): Promise<ChannelStatusDto> {
    const channel = await this.youtubeService.getChannelInfo();
    const cookies = this.cookiesRefresh.getStatus();

    return {
      connected: !!channel,
      channelId: channel?.channelId ?? undefined,
      channelTitle: channel?.channelTitle ?? undefined,
      needsReauth: channel === null,
      cookiesAgeSec: cookies.exists ? cookies.ageSec : undefined,
    };
  }

  @Get('cookies/status')
  @ApiOperation({ summary: 'Get cookies file status' })
  getCookiesStatus() {
    return this.cookiesRefresh.getStatus();
  }
}
