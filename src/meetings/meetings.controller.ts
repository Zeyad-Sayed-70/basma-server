import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import {
  MeetingResponseDto,
  MeetingListResponseDto,
} from './dto/meeting-response.dto';

@ApiTags('Meetings')
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @Roles('teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a meeting request' })
  @ApiResponse({
    status: 201,
    description: 'Meeting request created',
    type: MeetingResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Time conflict with another meeting',
  })
  async create(@Body() dto: CreateMeetingDto): Promise<MeetingResponseDto> {
    return this.meetingsService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @Roles('teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my meeting requests' })
  @ApiResponse({ status: 200, type: MeetingListResponseDto })
  async findAll(): Promise<MeetingListResponseDto> {
    return this.meetingsService.findAll();
  }

  @Get('admin')
  @UseGuards(AuthGuard('jwt'))
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all meeting requests (admin)' })
  @ApiResponse({ status: 200, type: MeetingListResponseDto })
  async findAllAdmin(): Promise<MeetingListResponseDto> {
    return this.meetingsService.findAllAdmin();
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update meeting request status/notes (admin)' })
  @ApiResponse({ status: 200, type: MeetingResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
  ): Promise<MeetingResponseDto> {
    return this.meetingsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @Roles('teacher')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel own meeting request' })
  @ApiResponse({ status: 200, type: MeetingResponseDto })
  async cancel(@Param('id') id: string): Promise<MeetingResponseDto> {
    return this.meetingsService.cancel(id);
  }
}
