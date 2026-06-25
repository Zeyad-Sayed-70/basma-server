import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ConfigurePaymobDto } from './dto/configure-paymob.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundDto } from './dto/refund.dto';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import {
  PaymentResponseDto,
  PaymobConfigStatusDto,
  MessageResponseDto,
  PaymentListResponseDto,
  PaymentStatsResponseDto,
  StudentPaymentInitiationResponseDto,
} from './dto/payment-response.dto';
import { PaymobConfigResponseDto } from './dto/paymob-config-response.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Paymob Configuration (Teacher) ─────────────────

  @Post('paymob/configure')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Configure Paymob credentials for this instance',
    description:
      'Saves the teacher\'s Paymob credentials (Model A — per-teacher Paymob account). ' +
      'The secret key and HMAC secret are AES-256-GCM encrypted at rest before storage. ' +
      'Call this once after the teacher creates their Paymob account and obtains their test/live credentials. ' +
      'Use PUT semantics — calling again overwrites the existing configuration.',
  })
  @ApiBody({ type: ConfigurePaymobDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Paymob configuration saved successfully. Secret keys returned masked.',
    type: PaymobConfigResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User is not a teacher or tenant context not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed (invalid fields)' })
  configurePaymob(@Body() dto: ConfigurePaymobDto) {
    return this.paymentsService.configurePaymob(dto);
  }

  @Get('paymob/config')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Get Paymob configuration (masked keys)',
    description:
      'Returns the current Paymob configuration for this instance. ' +
      'Secret keys are masked for security (only first 4 + last 4 chars visible). ' +
      'Returns isConfigured: false if no configuration exists yet.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paymob configuration (keys masked). If unconfigured, returns { isConfigured: false }.',
    type: PaymobConfigResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  getPaymobConfig() {
    return this.paymentsService.getPaymobConfig();
  }

  @Delete('paymob/config')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Remove Paymob configuration',
    description:
      'Deletes the Paymob credentials for this instance. ' +
      'After removal, students will not be able to initiate new payments until Paymob is re-configured. ' +
      'Existing payment records are preserved.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration removed successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No Paymob configuration exists' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  removePaymobConfig() {
    return this.paymentsService.removePaymobConfig();
  }

  // ─── Student Payment Initiation ─────────────────────

  @Post('pay')
  @Roles('student')
  @ApiOperation({
    summary: 'Initiate payment for a course (student)',
    description:
      'Creates a Paymob payment intention and returns a checkout URL. ' +
      'The student must be enrolled in the course, and the course must have price > 0. ' +
      'Only one pending payment per student per course is allowed at a time. ' +
      'The returned checkoutUrl should be opened in a browser to redirect to Paymob Unified Checkout. ' +
      'The webhook will update the payment status automatically when the student completes or fails payment.',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment intention created. Redirect student to checkoutUrl.',
    type: StudentPaymentInitiationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Course not found or student not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Student is not enrolled in this course' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Free course, duplicate pending payment, or Paymob not configured' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  initiatePayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: { id: string; instanceId: string },
  ) {
    return this.paymentsService.initiateStudentPayment(dto, user);
  }

  // ─── Teacher Payment Management ─────────────────────

  @Post()
  @Roles('teacher')
  @ApiOperation({
    summary: 'Create a manual payment record (offline/cash)',
    description:
      'Records a payment that was collected outside Paymob (cash, bank transfer, etc.). ' +
      'This creates a Payment record with status = PAID directly — no Paymob intention is created. ' +
      'Use this for offline payments your teacher collects manually from students.',
  })
  @ApiBody({ type: ManualPaymentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Manual payment recorded',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Student not found in this instance' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'User is not a teacher or tenant context not found' })
  createManual(@Body() dto: ManualPaymentDto) {
    return this.paymentsService.createManualPayment(dto);
  }

  @Get()
  @Roles('teacher')
  @ApiOperation({
    summary: 'List payments',
    description:
      'Returns paginated list of payments for this instance. ' +
      'Filterable by student, course, and payment status. ' +
      'Payments are ordered by creation date (newest first).',
  })
  @ApiQuery({ name: 'studentId', required: false, description: 'Filter by student ID' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course ID' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by payment status',
    enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED'],
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-indexed)', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 100)', example: '50' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of payments',
    type: PaymentListResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  findAll(
    @Query('studentId') studentId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findAll({
      studentId,
      courseId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Get payment statistics',
    description:
      'Returns aggregate payment statistics for this instance: ' +
      'counts of paid/pending/refunded payments and total revenue.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment statistics',
    type: PaymentStatsResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  getStats() {
    return this.paymentsService.getStats();
  }

  @Get(':id')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Get payment details',
    description:
      'Returns full details for a single payment, including student info, course info, ' +
      'all Paymob correlation IDs, and the checkout URL (if applicable).',
  })
  @ApiParam({ name: 'id', description: 'Payment record ID', example: 'clxq8a2b30001jf08m3n4o5p6' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Full payment details',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Payment not found in this instance' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Post(':id/refund')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Refund a payment via Paymob',
    description:
      'Initiates a refund for a paid payment through Paymob. ' +
      'The payment must have status = PAID and a Paymob transaction ID. ' +
      'Partial refunds are supported by specifying amountCents less than the original amount. ' +
      'The final refund status (REFUNDED / PARTIALLY_REFUNDED) is updated via webhook callback.',
  })
  @ApiParam({ name: 'id', description: 'Payment record ID to refund', example: 'clxq8a2b30001jf08m3n4o5p6' })
  @ApiBody({ type: RefundDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refund initiated — status will update after webhook confirmation',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Refund initiated' },
        result: { type: 'object', description: 'Raw Paymob refund response' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Payment not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Payment is not PAID, has no transaction ID, or refund failed' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid or missing JWT token' })
  refund(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.paymentsService.refund(id, dto);
  }
}
