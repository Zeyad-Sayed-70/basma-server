import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../common/context/tenant-context';

const TENANT_MODELS = new Set([
  'Teacher',
  'Brand',
  'Group',
  'Student',
  'Course',
  'CourseEnrollment',
  'Session',
  'Quiz',
  'QuizQuestion',
  'StudentQuizAttempt',
  'Assignment',
  'StudentAssignmentSubmission',
  'Notification',
  'Payment',
  'QuestionBank',
  'ChatMessage',
]);

const SCOPE_ACTIONS = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'count',
  'aggregate',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

function shouldScope(model: string, action: string): boolean {
  return TENANT_MODELS.has(model) && SCOPE_ACTIONS.has(action);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();

    const extended = (
      this as unknown as { $extends: (ext: unknown) => Record<string, unknown> }
    ).$extends({
      query: {
        $allModels: {
          // eslint-disable-next-line @typescript-eslint/require-await
          async $allOperations(params: {
            model: string;
            operation: string;
            args: Record<string, unknown>;
            query: (args: Record<string, unknown>) => unknown;
          }) {
            const instanceId = TenantContext.getInstanceId();
            if (instanceId && shouldScope(params.model, params.operation)) {
              if (!params.args.where) params.args.where = {};
              (params.args.where as Record<string, unknown>).instanceId =
                instanceId;
            }
            return params.query(params.args);
          },
        },
      },
    });

    Object.assign(this, extended);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
