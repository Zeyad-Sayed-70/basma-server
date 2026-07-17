import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import {
  MeetingResponseDto,
  MeetingListResponseDto,
} from './dto/meeting-response.dto';
import { MeetingRequestStatus } from '@prisma/client';

const MEETING_WINDOW_HOURS = 2;

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async create(dto: CreateMeetingDto): Promise<MeetingResponseDto> {
    const instanceId = this.getInstanceId();
    const requestedDate = new Date(dto.requestedDate);

    const windowStart = new Date(
      requestedDate.getTime() - MEETING_WINDOW_HOURS * 60 * 60 * 1000,
    );
    const windowEnd = new Date(
      requestedDate.getTime() + MEETING_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const conflict = await this.prisma.meetingRequest.findFirst({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] as MeetingRequestStatus[] },
        requestedDate: { gte: windowStart, lte: windowEnd },
      },
      orderBy: { requestedDate: 'asc' },
    });

    if (conflict) {
      const conflictTime = conflict.requestedDate.toISOString();
      throw new ConflictException(
        `This time conflicts with an existing meeting at ${conflictTime}. The 2-hour window around that time is already booked.`,
      );
    }

    const meeting = await this.prisma.meetingRequest.create({
      data: {
        instanceId,
        requestedDate,
        teacherNotes: dto.teacherNotes,
      },
    });

    return this.toResponse(meeting);
  }

  async findAll(): Promise<MeetingListResponseDto> {
    const instanceId = this.getInstanceId();
    const meetings = await this.prisma.meetingRequest.findMany({
      where: { instanceId },
      orderBy: { requestedDate: 'desc' },
    });

    return {
      data: meetings.map((m) => this.toResponse(m)),
      total: meetings.length,
    };
  }

  async findAllAdmin(): Promise<MeetingListResponseDto> {
    const meetings = await this.prisma.meetingRequest.findMany({
      orderBy: { requestedDate: 'desc' },
    });

    return {
      data: meetings.map((m) => this.toResponse(m)),
      total: meetings.length,
    };
  }

  async update(id: string, dto: UpdateMeetingDto): Promise<MeetingResponseDto> {
    const meeting = await this.prisma.meetingRequest.findUnique({
      where: { id },
    });
    if (!meeting) throw new NotFoundException('Meeting request not found');

    const updated = await this.prisma.meetingRequest.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.adminNotes !== undefined && { adminNotes: dto.adminNotes }),
      },
    });

    return this.toResponse(updated);
  }

  async cancel(id: string): Promise<MeetingResponseDto> {
    const instanceId = this.getInstanceId();
    const meeting = await this.prisma.meetingRequest.findUnique({
      where: { id },
    });
    if (!meeting) throw new NotFoundException('Meeting request not found');
    if (meeting.instanceId !== instanceId) {
      throw new ForbiddenException(
        'You can only cancel your own meeting requests',
      );
    }

    const updated = await this.prisma.meetingRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return this.toResponse(updated);
  }

  private toResponse(meeting: {
    id: string;
    instanceId: string;
    requestedDate: Date;
    status: MeetingRequestStatus;
    teacherNotes: string | null;
    adminNotes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MeetingResponseDto {
    return {
      id: meeting.id,
      instanceId: meeting.instanceId,
      requestedDate: meeting.requestedDate.toISOString(),
      status: meeting.status,
      teacherNotes: meeting.teacherNotes ?? undefined,
      adminNotes: meeting.adminNotes ?? undefined,
      createdAt: meeting.createdAt.toISOString(),
      updatedAt: meeting.updatedAt.toISOString(),
    };
  }
}
