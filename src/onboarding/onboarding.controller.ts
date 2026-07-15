import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { OnboardingService } from './onboarding.service';
import { SaveAnswersDto } from './dto/save-answers.dto';
import { OnboardingStatusDto } from './dto/onboarding-status.dto';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Roles('teacher')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  @ApiOperation({
    summary: 'Get onboarding status',
    description:
      'Returns whether onboarding is completed, saved answers, and whether landing content has been generated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding status retrieved',
    type: OnboardingStatusDto,
  })
  async getStatus() {
    return this.onboardingService.getStatus();
  }

  @Put('answers')
  @ApiOperation({
    summary: 'Save onboarding answers',
    description:
      'Saves the teacher onboarding form answers. Can be called multiple times (partial updates).',
  })
  @ApiResponse({
    status: 200,
    description: 'Answers saved',
    type: OnboardingStatusDto,
  })
  async saveAnswers(@Body() dto: SaveAnswersDto) {
    return this.onboardingService.saveAnswers(dto);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate landing page from answers',
    description:
      'Uses AI to generate landing page content, SEO fields, and brand settings from the saved onboarding answers. Returns a preview.',
  })
  @ApiResponse({
    status: 201,
    description: 'Landing page content generated',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing answers or AI error',
  })
  async generate() {
    return this.onboardingService.generate();
  }

  @Post('publish')
  @ApiOperation({
    summary: 'Publish landing page and complete onboarding',
    description:
      'Publishes the generated landing page and marks onboarding as completed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Page published, onboarding completed',
  })
  async publish() {
    return this.onboardingService.publish();
  }

  @Post('skip')
  @ApiOperation({
    summary: 'Skip onboarding',
    description:
      'Marks onboarding as completed without generating any landing page content.',
  })
  @ApiResponse({
    status: 201,
    description: 'Onboarding skipped',
  })
  async skip() {
    return this.onboardingService.skip();
  }
}
