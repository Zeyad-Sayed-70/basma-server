import { prisma, getInstanceId } from '../prisma-client';
import type { ToolDefinition } from '../types';

export const studentProfileTool: ToolDefinition = {
  name: 'basma_student_profile',
  description:
    'Get or update the synthesized student profile. Use "get" to read the student\'s memory (profile + recent notes). Use "update" to save synthesized observations about the student\'s learning style, strengths, weaknesses, and preferences.',
  inputSchema: {
    type: 'object',
    properties: {
      studentId: { type: 'string', description: 'Student ID' },
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['get', 'update'],
      },
      profileData: {
        type: 'object',
        description: 'Profile data to save (only for "update" action)',
        properties: {
          learningStyle: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
          preferences: { type: 'object' },
          summary: { type: 'string' },
        },
      },
    },
    required: ['studentId', 'action'],
  },
  handler: async (args: {
    studentId: string;
    action: 'get' | 'update';
    profileData?: Record<string, unknown>;
  }) => {
    const instanceId = getInstanceId();

    const student = await prisma.student.findUnique({
      where: { id: args.studentId },
    });

    if (!student) {
      return {
        content: [{ type: 'text', text: 'Error: Student not found.' }],
        isError: true,
      };
    }

    if (student.instanceId !== instanceId) {
      return {
        content: [
          { type: 'text', text: 'Error: Cross-instance access denied.' },
        ],
        isError: true,
      };
    }

    if (args.action === 'get') {
      const recentNotes = await prisma.agentStudentNote.findMany({
        where: { studentId: args.studentId, instanceId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { category: true, content: true, createdAt: true },
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                profile: student.agentProfile,
                recentNotes,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (args.action === 'update') {
      if (!args.profileData) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: profileData is required for update action.',
            },
          ],
          isError: true,
        };
      }

      const existingProfile = student.agentProfile as Record<string, unknown>;
      const mergedProfile = {
        ...existingProfile,
        ...args.profileData,
        lastUpdated: new Date().toISOString(),
      };

      await prisma.student.update({
        where: { id: args.studentId },
        data: { agentProfile: mergedProfile },
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { success: true, profile: mergedProfile },
              null,
              2,
            ),
          },
        ],
      };
    }

    return {
      content: [{ type: 'text', text: 'Error: Invalid action.' }],
      isError: true,
    };
  },
};
