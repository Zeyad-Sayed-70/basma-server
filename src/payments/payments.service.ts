import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { PaymobService } from './paymob.service';
import { encrypt, decrypt } from './paymob-crypto.util';
import { verifyHmac } from './paymob-hmac.util';
import { ConfigurePaymobDto } from './dto/configure-paymob.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { RefundDto } from './dto/refund.dto';

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly encryptionKey: string;
  private readonly baseUrl: string;
  private readonly webhookBaseUrl: string;
  private readonly frontendBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymobService: PaymobService,
    configService: ConfigService,
  ) {
    this.encryptionKey =
      configService.get<string>('PAYMOB_ENCRYPTION_KEY') ?? '';
    this.baseUrl =
      configService.get<string>('PAYMOB_BASE_URL') ??
      'https://accept.paymob.com';
    this.webhookBaseUrl =
      configService.get<string>('PAYMOB_WEBHOOK_BASE_URL') ??
      'http://localhost:3000';
    this.frontendBaseUrl =
      configService.get<string>('FRONTEND_BASE_URL') ?? 'http://localhost:3000';
  }

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  private async getPaymobConfigForInstance(instanceId: string) {
    const config = await this.prisma.paymobConfig.findUnique({
      where: { instanceId },
    });
    if (!config || !config.isConfigured) {
      throw new BadRequestException(
        'Paymob is not configured for this instance. Please configure it first.',
      );
    }
    return config;
  }

  // ─── Paymob Config ──────────────────────────────────

  async configurePaymob(dto: ConfigurePaymobDto) {
    const instanceId = this.getInstanceId();
    const encryptedSecretKey = encrypt(dto.secretKey, this.encryptionKey);
    const encryptedHmacSecret = encrypt(dto.hmacSecret, this.encryptionKey);

    const config = await this.prisma.paymobConfig.upsert({
      where: { instanceId },
      update: {
        secretKey: encryptedSecretKey,
        publicKey: dto.publicKey,
        hmacSecret: encryptedHmacSecret,
        cardIntegrationId: dto.cardIntegrationId,
        walletIntegrationId: dto.walletIntegrationId ?? null,
        mode: dto.mode ?? 'test',
        isConfigured: true,
      },
      create: {
        instanceId,
        secretKey: encryptedSecretKey,
        publicKey: dto.publicKey,
        hmacSecret: encryptedHmacSecret,
        cardIntegrationId: dto.cardIntegrationId,
        walletIntegrationId: dto.walletIntegrationId ?? null,
        mode: dto.mode ?? 'test',
        isConfigured: true,
      },
    });

    return {
      id: config.id,
      isConfigured: config.isConfigured,
      secretKey: maskKey(dto.secretKey),
      publicKey: maskKey(dto.publicKey),
      cardIntegrationId: config.cardIntegrationId,
      walletIntegrationId: config.walletIntegrationId,
      mode: config.mode,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  async getPaymobConfig() {
    const instanceId = this.getInstanceId();
    const config = await this.prisma.paymobConfig.findUnique({
      where: { instanceId },
    });
    if (!config) {
      return { isConfigured: false };
    }

    return {
      id: config.id,
      isConfigured: config.isConfigured,
      secretKey: config.isConfigured
        ? maskKey(decrypt(config.secretKey, this.encryptionKey))
        : '****',
      publicKey: config.isConfigured ? maskKey(config.publicKey) : '****',
      cardIntegrationId: config.cardIntegrationId,
      walletIntegrationId: config.walletIntegrationId,
      mode: config.mode,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  async removePaymobConfig() {
    const instanceId = this.getInstanceId();
    try {
      await this.prisma.paymobConfig.delete({ where: { instanceId } });
    } catch {
      throw new NotFoundException('Paymob config not found');
    }
    return { message: 'Paymob configuration removed' };
  }

  // ─── Student Payment Initiation ─────────────────────

  async initiateStudentPayment(
    dto: CreatePaymentDto,
    studentUser: { id: string; instanceId: string },
  ) {
    const studentId = studentUser.id;
    const instanceId = studentUser.instanceId;

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (!course.price || course.price <= 0) {
      throw new BadRequestException(
        'This course is free. No payment required.',
      );
    }

    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: dto.courseId } },
    });
    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    const existingPending = await this.prisma.payment.findFirst({
      where: {
        studentId,
        courseId: dto.courseId,
        status: { in: ['PENDING', 'PROCESSING'] },
        instanceId,
      },
    });
    if (existingPending) {
      throw new BadRequestException(
        'A pending payment already exists for this course. Complete or cancel it first.',
      );
    }

    const paymobConfig = await this.getPaymobConfigForInstance(instanceId);
    const secretKey = decrypt(paymobConfig.secretKey, this.encryptionKey);
    const amountCents = Math.round(course.price * 100);

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const payment = await this.prisma.payment.create({
      data: {
        studentId,
        courseId: dto.courseId,
        amountCents,
        currency: 'EGP',
        status: 'PENDING',
        instanceId,
        specialReference: `${instanceId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
    });

    const notificationUrl = `${this.webhookBaseUrl}/api/payments/webhook/paymob/${instanceId}`;
    const redirectionUrl = `${this.frontendBaseUrl}/payments/return?paymentId=${payment.id}`;

    const paymentMethodIds: number[] = [paymobConfig.cardIntegrationId!];
    if (paymobConfig.walletIntegrationId) {
      paymentMethodIds.push(paymobConfig.walletIntegrationId);
    }

    try {
      const intention = await this.paymobService.createIntention(secretKey, {
        amountCents,
        currency: 'EGP',
        paymentMethodIds,
        specialReference: payment.specialReference!,
        notificationUrl,
        redirectionUrl,
        billingData: {
          firstName: student.name,
          lastName: student.name.includes(' ')
            ? student.name.split(' ').slice(1).join(' ')
            : 'N/A',
          email: student.email ?? `${student.id}@placeholder.com`,
          phoneNumber: student.phone ?? '01000000000',
        },
        items: [
          {
            name: course.title,
            amount: amountCents,
            quantity: 1,
          },
        ],
        extras: { paymentId: payment.id },
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymobIntentionId: intention.id,
          paymobOrderId: intention.intentionOrderId,
          clientSecret: intention.clientSecret,
          status: 'PROCESSING',
        },
      });

      const checkoutUrl = `${this.baseUrl}/unifiedcheckout/?publicKey=${paymobConfig.publicKey}&clientSecret=${intention.clientSecret}`;

      return {
        id: payment.id,
        amountCents,
        amountFormatted: `${(amountCents / 100).toFixed(2)} EGP`,
        currency: 'EGP',
        status: 'PROCESSING',
        clientSecret: intention.clientSecret,
        checkoutUrl,
        createdAt: payment.createdAt.toISOString(),
      };
    } catch (err) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw err;
    }
  }

  // ─── Teacher Payment Management ─────────────────────

  async createManualPayment(dto: ManualPaymentDto) {
    const instanceId = this.getInstanceId();

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, instanceId },
    });
    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        amountCents: dto.amountCents,
        currency: dto.currency ?? 'EGP',
        status: 'PAID',
        notes: dto.notes,
        instanceId,
        specialReference: `manual_${instanceId}_${Date.now()}`,
      },
    });
  }

  async findAll(filters: {
    studentId?: string;
    courseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const instanceId = this.getInstanceId();
    const where: Record<string, unknown> = { instanceId };

    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.status) where.status = filters.status;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    const data = payments.map((p) => ({
      id: p.id,
      studentId: p.studentId,
      student: p.student,
      courseId: p.courseId ?? undefined,
      amountCents: p.amountCents,
      amountFormatted: `${(p.amountCents / 100).toFixed(2)} ${p.currency}`,
      currency: p.currency,
      status: p.status,
      paymobIntentionId: p.paymobIntentionId ?? undefined,
      paymobOrderId: p.paymobOrderId ?? undefined,
      paymobTransactionId: p.paymobTransactionId ?? undefined,
      notes: p.notes ?? undefined,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return { data, total };
  }

  async findOne(id: string) {
    const instanceId = this.getInstanceId();
    const payment = await this.prisma.payment.findFirst({
      where: { id, instanceId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    return {
      id: payment.id,
      studentId: payment.studentId,
      student: payment.student,
      courseId: payment.courseId ?? undefined,
      course: payment.course ?? undefined,
      amountCents: payment.amountCents,
      amountFormatted: `${(payment.amountCents / 100).toFixed(2)} ${payment.currency}`,
      currency: payment.currency,
      status: payment.status,
      paymobIntentionId: payment.paymobIntentionId ?? undefined,
      paymobOrderId: payment.paymobOrderId ?? undefined,
      paymobTransactionId: payment.paymobTransactionId ?? undefined,
      clientSecret: payment.clientSecret ?? undefined,
      checkoutUrl: payment.clientSecret
        ? `${this.baseUrl}/unifiedcheckout/?publicKey=****&clientSecret=${payment.clientSecret}`
        : undefined,
      notes: payment.notes ?? undefined,
      metadata: payment.metadata,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  async refund(paymentId: string, dto: RefundDto) {
    const instanceId = this.getInstanceId();
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, instanceId },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== 'PAID') {
      throw new BadRequestException(
        `Cannot refund payment with status "${payment.status}". Only PAID payments can be refunded.`,
      );
    }

    if (!payment.paymobTransactionId) {
      throw new BadRequestException(
        'This payment has no Paymob transaction ID and cannot be refunded via Paymob.',
      );
    }

    const paymobConfig = await this.getPaymobConfigForInstance(instanceId);
    const secretKey = decrypt(paymobConfig.secretKey, this.encryptionKey);
    const amountCents = dto.amountCents ?? payment.amountCents;

    const result = await this.paymobService.refund(secretKey, {
      transactionId: payment.paymobTransactionId,
      amountCents,
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status:
          amountCents >= payment.amountCents
            ? 'REFUNDED'
            : 'PARTIALLY_REFUNDED',
        notes: `Refund initiated: ${(amountCents / 100).toFixed(2)} ${payment.currency}`,
      },
    });

    return { message: 'Refund initiated', result };
  }

  async getStats() {
    const instanceId = this.getInstanceId();

    const payments = await this.prisma.payment.findMany({
      where: { instanceId },
    });

    const totalPaid = payments.filter((p) => p.status === 'PAID').length;
    const totalPending = payments.filter(
      (p) => p.status === 'PENDING' || p.status === 'PROCESSING',
    ).length;
    const totalRefunded = payments.filter(
      (p) => p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED',
    ).length;
    const revenueCents = payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amountCents, 0);

    return {
      totalPaid,
      totalPending,
      totalRefunded,
      revenueCents,
      revenueFormatted: `${(revenueCents / 100).toFixed(2)} EGP`,
    };
  }

  // ─── Webhook Handling ───────────────────────────────

  async handleWebhook(
    instanceId: string,
    body: Record<string, unknown>,
    queryHmac?: string,
  ): Promise<{ received: boolean }> {
    const config = await this.prisma.paymobConfig.findUnique({
      where: { instanceId },
    });
    if (!config || !config.isConfigured) {
      this.logger.warn(
        `Webhook received for unknown/unconfigured instance: ${instanceId}`,
      );
      return { received: true };
    }

    const obj = body['obj'] as Record<string, unknown> | undefined;
    const bodyHmac =
      queryHmac || String(body['hmac'] ?? body['hmac_header'] ?? '');

    if (!bodyHmac) {
      this.logger.warn(
        `Webhook without HMAC rejected for instance ${instanceId}`,
      );
      throw new UnauthorizedException('Missing webhook signature');
    }

    if (!obj) {
      this.logger.warn('Webhook without obj field rejected');
      throw new UnauthorizedException('Invalid webhook payload');
    }

    const hmacSecret = decrypt(config.hmacSecret, this.encryptionKey);
    if (!verifyHmac(obj, bodyHmac, hmacSecret)) {
      this.logger.warn(`HMAC verification failed for instance ${instanceId}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const rawOrderId = (obj['order'] as Record<string, unknown> | undefined)?.[
      'id'
    ];
    const paymobOrderId = rawOrderId != null ? String(rawOrderId) : undefined;
    if (!paymobOrderId) {
      this.logger.warn('Webhook received without order.id field');
      return { received: true };
    }

    const payment = await this.prisma.payment.findFirst({
      where: { paymobOrderId, instanceId },
    });
    if (!payment) {
      this.logger.warn(
        `Webhook for unknown order ${paymobOrderId} in instance ${instanceId}`,
      );
      return { received: true };
    }

    const success = obj['success'] === true || obj['success'] === 'true';
    const isRefunded =
      obj['is_refunded'] === true || obj['is_refunded'] === 'true';
    const isVoided = obj['is_voided'] === true || obj['is_voided'] === 'true';

    let newStatus: string;
    if (isRefunded) {
      const refundAmount = Number(obj['amount_cents'] ?? 0);
      newStatus =
        refundAmount >= payment.amountCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    } else if (isVoided) {
      newStatus = 'VOIDED';
    } else if (success) {
      newStatus = 'PAID';
    } else {
      newStatus = 'FAILED';
    }

    if (payment.status === newStatus) {
      return { received: true };
    }

    const transactionId = obj['id'];
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus as never,
        paymobTransactionId:
          transactionId != null
            ? String(transactionId)
            : (payment.paymobTransactionId ?? undefined),
      } as never,
    });

    this.logger.log(
      `Payment ${payment.id} updated: ${payment.status} → ${newStatus}`,
    );
    return { received: true };
  }
}
