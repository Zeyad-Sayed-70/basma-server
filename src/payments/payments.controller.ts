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
import { TeacherPaymentMethodsService } from './teacher-payment-methods.service';
import { ConfigurePaymobDto } from './dto/configure-paymob.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RefundDto } from './dto/refund.dto';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { InitiateAlternativePaymentDto } from './dto/initiate-alternative-payment.dto';
import { TeacherActionDto } from './dto/teacher-action.dto';
import {
  PaymentResponseDto,
  PaymobConfigStatusDto,
  PaymobMessageDto,
  PaymentListResponseDto,
  PaymentStatsResponseDto,
  StudentPaymentInitiationResponseDto,
  AlternativePaymentInitiationResponseDto,
} from './dto/payment-response.dto';
import {
  PaymentMethodResponseDto,
  PaymentMethodListResponseDto,
} from './dto/payment-method-response.dto';
import { PaymobConfigResponseDto } from './dto/paymob-config-response.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentMethodsService: TeacherPaymentMethodsService,
  ) {}

  // ─── Paymob Configuration (Teacher) ─────────────────

  @Post('paymob/configure')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Configure Paymob credentials for this instance',
    description:
      "Saves the teacher's Paymob credentials (Model A — per-teacher Paymob account). " +
      'The secret key and HMAC secret are AES-256-GCM encrypted at rest before storage. ' +
      'Call this once after the teacher creates their Paymob account and obtains their test/live credentials. ' +
      'Use PUT semantics — calling again overwrites the existing configuration.',
  })
  @ApiBody({ type: ConfigurePaymobDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'Paymob configuration saved successfully. Secret keys returned masked.',
    type: PaymobConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a teacher or tenant context not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed (invalid fields)',
  })
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
    description:
      'Paymob configuration (keys masked). If unconfigured, returns { isConfigured: false }.',
    type: PaymobConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
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
    type: PaymobMessageDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No Paymob configuration exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  removePaymobConfig() {
    return this.paymentsService.removePaymobConfig();
  }

  // ─── Teacher Payment Methods (Wallet/Instapay) ──────

  @Post('methods')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Create a wallet or Instapay payment method',
    description:
      'Saves a new alternative payment method (wallet or Instapay) for the teacher. ' +
      'The teacher can have multiple methods. Each method can be toggled active/inactive.',
  })
  @ApiBody({ type: CreatePaymentMethodDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment method created successfully',
    type: PaymentMethodResponseDto,
  })
  createPaymentMethod(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(dto);
  }

  @Get('methods')
  @Roles('teacher')
  @ApiOperation({
    summary: 'List all payment methods',
    description:
      'Returns all wallet/Instapay payment methods configured by the teacher for this instance.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of payment methods',
    type: PaymentMethodListResponseDto,
  })
  async findAllPaymentMethods() {
    const data = await this.paymentMethodsService.findAll();
    return { data };
  }

  @Get('methods/active')
  @Roles('student')
  @ApiOperation({
    summary: 'List active payment methods (student view)',
    description:
      'Returns only the active payment methods. Account numbers are masked for privacy. ' +
      'Full details are revealed when the student initiates a payment.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active payment methods (masked)',
    type: PaymentMethodListResponseDto,
  })
  async findActivePaymentMethods() {
    const data = await this.paymentMethodsService.findActiveMethods(true);
    return { data };
  }

  @Get('methods/:id')
  @Roles('teacher')
  @ApiOperation({ summary: 'Get a single payment method by ID' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method details',
    type: PaymentMethodResponseDto,
  })
  findOnePaymentMethod(@Param('id') id: string) {
    return this.paymentMethodsService.findOne(id);
  }

  @Patch('methods/:id')
  @Roles('teacher')
  @ApiOperation({ summary: 'Update a payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiBody({ type: UpdatePaymentMethodDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method updated',
    type: PaymentMethodResponseDto,
  })
  updatePaymentMethod(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.update(id, dto);
  }

  @Delete('methods/:id')
  @Roles('teacher')
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method deleted',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Payment method deleted' },
      },
    },
  })
  deletePaymentMethod(@Param('id') id: string) {
    return this.paymentMethodsService.delete(id);
  }

  // ─── Student Payment Initiation ─────────────────────

  @Post('pay')
  @Roles('student')
  @ApiOperation({
    summary: 'Initiate payment for a course (student)',
    description:
      'Creates a Paymob payment intention and returns a checkout URL. ' +
      'The student must NOT already be enrolled in the course, and the course must have price > 0. ' +
      'If a pending payment already exists with a valid clientSecret, the existing checkout URL is returned instead of creating a new intention. ' +
      'Only one pending payment per student per course is allowed at a time — cancel the old one first via POST /payments/:id/cancel. ' +
      'The returned checkoutUrl should be opened in a browser to redirect to Paymob Unified Checkout. ' +
      'The webhook will update the payment status and auto-enroll the student when payment succeeds.',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment intention created. Redirect student to checkoutUrl.',
    type: StudentPaymentInitiationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found or student not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Student does not have access to this course',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Free course, already enrolled, expired pending payment, or Paymob not configured',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
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
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Student not found in this instance',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not a teacher or tenant context not found',
  })
  createManual(@Body() dto: ManualPaymentDto) {
    return this.paymentsService.createManualPayment(dto);
  }

  @Get()
  @Roles('teacher', 'student')
  @ApiOperation({
    summary: 'List payments',
    description:
      'Returns paginated list of payments for this instance. ' +
      'Filterable by student, course, and payment status. ' +
      'Students can only see their own payments. ' +
      'Payments are ordered by creation date (newest first).',
  })
  @ApiQuery({
    name: 'studentId',
    required: false,
    description: 'Filter by student ID',
  })
  @ApiQuery({
    name: 'courseId',
    required: false,
    description: 'Filter by course ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by payment status',
    enum: [
      'PENDING',
      'PROCESSING',
      'PAID',
      'STUDENT_CONFIRMED',
      'FAILED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
      'VOIDED',
      'CANCELLED',
    ],
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
    status: HttpStatus.OK,
    description: 'Paginated list of payments',
    type: PaymentListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  findAll(
    @Query('studentId') studentId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: { id: string; role: string },
  ) {
    return this.paymentsService.findAll(
      {
        studentId,
        courseId,
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      user,
    );
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
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  getStats() {
    return this.paymentsService.getStats();
  }

  // ─── Alternative Payment (Wallet/Instapay) ──────────

  @Post('alternative/initiate')
  @Roles('student')
  @ApiOperation({
    summary: 'Initiate alternative payment (wallet or Instapay)',
    description:
      'Creates a payment using a teacher-configured wallet or Instapay method. ' +
      'Returns the teacher\'s full payment details so the student can transfer the money. ' +
      'After paying externally, the student must call student-confirm to notify the teacher.',
  })
  @ApiBody({ type: InitiateAlternativePaymentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      'Alternative payment initiated. Returns teacher payment details.',
    type: AlternativePaymentInitiationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course or payment method not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Student does not have access to this course',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Free course, already enrolled, or pending payment exists',
  })
  initiateAlternativePayment(
    @Body() dto: InitiateAlternativePaymentDto,
    @CurrentUser() user: { id: string; instanceId: string },
  ) {
    return this.paymentsService.initiateAlternativePayment(dto, user);
  }

  @Patch(':id/student-confirm')
  @Roles('student')
  @ApiOperation({
    summary: 'Student confirms they have paid',
    description:
      'Marks a pending alternative payment as confirmed by the student. ' +
      'The student should call this after transferring the money to the teacher\'s wallet/Instapay. ' +
      'Sets the status to STUDENT_CONFIRMED so the teacher can verify and approve.',
  })
  @ApiParam({ name: 'id', description: 'Payment record ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment confirmed by student',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Payment confirmed by student' },
        id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Student trying to confirm another student\'s payment',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment is not in PENDING status',
  })
  studentConfirm(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; instanceId: string },
  ) {
    return this.paymentsService.studentConfirmPayment(id, user);
  }

  @Patch(':id/teacher-approve')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Teacher approves a student-confirmed payment',
    description:
      'Verifies receipt of funds and approves the payment. ' +
      'The payment must be in STUDENT_CONFIRMED status. ' +
      'This sets the status to PAID and automatically enrolls the student in the course.',
  })
  @ApiParam({ name: 'id', description: 'Payment record ID' })
  @ApiBody({ type: TeacherActionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment approved and student enrolled',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Payment approved and student enrolled',
        },
        id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment is not in STUDENT_CONFIRMED status',
  })
  teacherApprove(
    @Param('id') id: string,
    @Body() dto: TeacherActionDto,
    @CurrentUser() user: { instanceId: string },
  ) {
    return this.paymentsService.teacherApprovePayment(id, dto, user);
  }

  @Patch(':id/teacher-reject')
  @Roles('teacher')
  @ApiOperation({
    summary: 'Teacher rejects a student-confirmed payment',
    description:
      'Rejects a student-confirmed payment when funds were not received. ' +
      'Sets the status to FAILED. An optional rejection reason can be provided in notes.',
  })
  @ApiParam({ name: 'id', description: 'Payment record ID' })
  @ApiBody({ type: TeacherActionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment rejected',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Payment rejected' },
        id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment is not in STUDENT_CONFIRMED status',
  })
  teacherReject(
    @Param('id') id: string,
    @Body() dto: TeacherActionDto,
    @CurrentUser() user: { instanceId: string },
  ) {
    return this.paymentsService.teacherRejectPayment(id, dto, user);
  }

  @Get(':id')
  @Roles('teacher', 'student')
  @ApiOperation({
    summary: 'Get payment details',
    description:
      'Returns full details for a single payment, including student info, course info, ' +
      'all Paymob correlation IDs, and the checkout URL (if applicable). ' +
      'Students can only access their own payments.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment record ID',
    example: 'clxq8a2b30001jf08m3n4o5p6',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Full payment details',
    type: PaymentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found in this instance',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user?: { id: string; role: string },
  ) {
    return this.paymentsService.findOne(id, user);
  }

  @Post(':id/cancel')
  @Roles('teacher', 'student')
  @ApiOperation({
    summary: 'Cancel a pending payment',
    description:
      'Cancels a PENDING, PROCESSING, or STUDENT_CONFIRMED payment. ' +
      'Students can only cancel their own payments. ' +
      'Teachers can cancel any payment in their instance. ' +
      'Once cancelled, the student can re-initiate payment for the same course.',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment record ID to cancel',
    example: 'clxq8a2b30001jf08m3n4o5p6',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment cancelled',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Payment cancelled' },
        id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: "Student trying to cancel another student's payment",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment is not PENDING, PROCESSING, or STUDENT_CONFIRMED',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  cancelPayment(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string; instanceId: string },
  ) {
    return this.paymentsService.cancelPayment(id, user);
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
  @ApiParam({
    name: 'id',
    description: 'Payment record ID to refund',
    example: 'clxq8a2b30001jf08m3n4o5p6',
  })
  @ApiBody({ type: RefundDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Refund initiated — status will update after webhook confirmation',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Refund initiated' },
        result: { type: 'object', description: 'Raw Paymob refund response' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment is not PAID, has no transaction ID, or refund failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing JWT token',
  })
  refund(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.paymentsService.refund(id, dto);
  }
}
