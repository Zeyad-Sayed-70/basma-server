import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { YoutubeService } from './youtube.service';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class OAuthBeginResponse {
  @ApiProperty()
  url: string;
}

class OAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from Google OAuth' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

@ApiTags('YouTube (Admin)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'teacher')
@Controller('youtube/oauth')
export class OauthController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Post('begin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get OAuth consent URL for YouTube channel setup' })
  begin(): OAuthBeginResponse {
    return { url: this.youtubeService.getAuthUrl() };
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange OAuth code for YouTube channel tokens' })
  async callback(@Body() dto: OAuthCallbackDto) {
    await this.youtubeService.saveTokens(dto.code);
    return { ok: true };
  }
}
