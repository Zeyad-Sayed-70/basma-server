import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { TASKS } from './constants/tasks.constant';
import { TasksListResponseDto } from './dto/tasks-list-response.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async findAll(): Promise<TasksListResponseDto> {
    const instanceId = this.getInstanceId();

    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      select: {
        onboardingCompleted: true,
        _count: {
          select: {
            groups: true,
            courses: true,
            students: true,
            sessions: true,
          },
        },
        brand: {
          select: { primaryColor: true, logoUrl: true },
        },
        landingPage: {
          select: { status: true },
        },
      },
    });

    if (!instance) throw new ForbiddenException('Instance not found');

    const checks: Record<string, boolean> = {
      complete_onboarding: instance.onboardingCompleted,
      create_first_group: instance._count.groups > 0,
      create_first_course: instance._count.courses > 0,
      add_first_student: instance._count.students > 0,
      create_first_session: instance._count.sessions > 0,
      customize_brand: instance.brand?.primaryColor !== '#2563eb',
      upload_logo: instance.brand?.logoUrl !== null,
      publish_landing: instance.landingPage?.status === 'PUBLISHED',
    };

    const tasks = TASKS.map((t) => ({
      ...t,
      completed: checks[t.key] ?? false,
    }));

    const completedCount = tasks.filter((t) => t.completed).length;

    return {
      tasks,
      completedCount,
      totalCount: tasks.length,
    };
  }
}
