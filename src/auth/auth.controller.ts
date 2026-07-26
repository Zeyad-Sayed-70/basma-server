import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { UpdateTeacherProfileDto } from './dto/update-profile.dto';
import { LoginDto } from './dto/login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  AuthResponseDto,
  MeResponseDto,
  StudentAuthResponseDto,
  StudentMeResponseDto,
} from './dto/auth-response.dto';
import { StudentSignupDto } from './dto/student-signup.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new teacher account',
    description:
      'Creates a new teacher instance (tenant) with a brand, teacher profile, and returns JWT tokens. ' +
      'The subdomain is auto-generated from the teacher name if not provided. ' +
      'The instance starts on the FREE tier by default.',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email or subdomain already taken' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticates a teacher using their email and password. ' +
      'Returns access and refresh JWT tokens upon successful authentication.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchange a valid refresh token for a new access token and refresh token pair. ' +
      'Refresh tokens are valid for 30 days.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current teacher profile',
    description:
      'Returns the authenticated teacher&#39;s profile including instance tier, subdomain, ' +
      'and account metadata. Requires a valid JWT token in the Authorization header.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: MeResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — invalid or missing token',
  })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update teacher profile',
    description:
      'Updates the authenticated teacher&#39;s profile (e.g., phone number). ' +
      'Returns the updated profile with any remaining required actions.',
  })
  @ApiBody({ type: UpdateTeacherProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: MeResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — invalid or missing token',
  })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTeacherProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Post('student/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Student signup via invitation code or open group',
    description:
      'Allows a student to join a group and get a JWT. ' +
      'If the code is a valid group ID and the group is in OPEN mode, the student joins directly. ' +
      'If the code is an invitation code (from a CLOSED group), the student joins via invitation. ' +
      'If the student email already exists, a new JWT is returned (idempotent re-auth). ' +
      'An optional password can be set during signup to enable future email+password login. ' +
      'Returns access and refresh JWT tokens for student API access.',
  })
  @ApiBody({ type: StudentSignupDto })
  @ApiResponse({
    status: 201,
    description: 'Student signed up successfully',
    type: StudentAuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Group is not open for registration',
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid invitation code or group ID',
  })
  async studentSignup(@Body() dto: StudentSignupDto) {
    return this.authService.studentSignup(dto);
  }

  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Student login with email and password',
    description:
      'Authenticates a student using their email and password. ' +
      'The student must have set a password during signup. ' +
      'Returns access and refresh JWT tokens upon successful authentication. ' +
      'Use this endpoint to sign in from another device after initial signup.',
  })
  @ApiBody({ type: StudentLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: StudentAuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Invalid email or password, or no password set for this account',
  })
  async studentLogin(@Body() dto: StudentLoginDto) {
    return this.authService.studentLogin(dto);
  }

  @Get('student/me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current student profile',
    description:
      "Returns the authenticated student's profile including group info. " +
      'Requires a valid student JWT token in the Authorization header.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student profile retrieved successfully',
    type: StudentMeResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — invalid or missing token',
  })
  async studentMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getStudentProfile(user.id);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout current session',
    description:
      'Deactivates the current session by its JWT ID. ' +
      'The access token and refresh token will no longer be valid.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    if (user.jti) {
      await this.authService.deactivateSession(user.jti);
    }
    return { message: 'Logged out successfully' };
  }

  @Post('logout/all')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout all sessions',
    description: 'Deactivates all active sessions for the current user.',
  })
  @ApiResponse({ status: 200, description: 'All sessions logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.deactivateAllSessions(
      user.id,
      user.role,
      user.instanceId,
    );
    return { message: 'All sessions logged out' };
  }
}
