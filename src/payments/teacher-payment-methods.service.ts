import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class TeacherPaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return '****';
    const visible = accountNumber.slice(-4);
    return `${'*'.repeat(accountNumber.length - 4)}${visible}`;
  }

  private mapMethod(method: {
    id: string;
    instanceId: string;
    type: string;
    walletType: string | null;
    accountName: string;
    accountNumber: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: method.id,
      type: method.type,
      walletType: method.walletType ?? undefined,
      accountName: method.accountName,
      accountNumber: method.accountNumber,
      isActive: method.isActive,
      createdAt: method.createdAt.toISOString(),
      updatedAt: method.updatedAt.toISOString(),
    };
  }

  async create(dto: CreatePaymentMethodDto) {
    const instanceId = this.getInstanceId();
    const method = await this.prisma.teacherPaymentMethod.create({
      data: {
        instanceId,
        type: dto.type,
        walletType: dto.walletType ?? null,
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        isActive: dto.isActive ?? true,
      },
    });
    return this.mapMethod(method);
  }

  async findAll() {
    const instanceId = this.getInstanceId();
    const methods = await this.prisma.teacherPaymentMethod.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'desc' },
    });
    return methods.map((m) => this.mapMethod(m));
  }

  async findActiveMethods(forStudent = false) {
    const instanceId = this.getInstanceId();
    const methods = await this.prisma.teacherPaymentMethod.findMany({
      where: { instanceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return methods.map((m) => {
      const mapped = this.mapMethod(m);
      if (forStudent) {
        mapped.accountNumber = this.maskAccountNumber(mapped.accountNumber);
      }
      return mapped;
    });
  }

  async findOne(id: string) {
    const instanceId = this.getInstanceId();
    const method = await this.prisma.teacherPaymentMethod.findFirst({
      where: { id, instanceId },
    });
    if (!method) throw new NotFoundException('Payment method not found');
    return this.mapMethod(method);
  }

  async update(id: string, dto: UpdatePaymentMethodDto) {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.teacherPaymentMethod.findFirst({
      where: { id, instanceId },
    });
    if (!existing) throw new NotFoundException('Payment method not found');
    const method = await this.prisma.teacherPaymentMethod.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.walletType !== undefined && { walletType: dto.walletType }),
        ...(dto.accountName !== undefined && { accountName: dto.accountName }),
        ...(dto.accountNumber !== undefined && {
          accountNumber: dto.accountNumber,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return this.mapMethod(method);
  }

  async delete(id: string) {
    const instanceId = this.getInstanceId();
    const existing = await this.prisma.teacherPaymentMethod.findFirst({
      where: { id, instanceId },
    });
    if (!existing) throw new NotFoundException('Payment method not found');
    await this.prisma.teacherPaymentMethod.delete({ where: { id } });
    return { message: 'Payment method deleted' };
  }
}
