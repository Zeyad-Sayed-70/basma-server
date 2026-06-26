import { prisma, getInstanceId } from '../prisma-client';
import type { ToolDefinition } from '../types';

export const noteRecordTool: ToolDefinition = {
  name: 'basma_note_record',
  description:
    "Record an observation or note about a student. This is the agent's memory — use this to persist anything you learn about the student across sessions.",
  inputSchema: {
    type: 'object',
    properties: {
      studentId: { type: 'string', description: 'Student ID' },
      category: {
        type: 'string',
        description: 'Note category',
        enum: [
          'learning_style',
          'weakness',
          'strength',
          'preference',
          'progress',
          'general',
        ],
      },
      content: { type: 'string', description: 'Observation/note content' },
    },
    required: ['studentId', 'category', 'content'],
  },
  handler: async (args: {
    studentId: string;
    category: string;
    content: string;
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

    const note = await prisma.agentStudentNote.create({
      data: {
        studentId: args.studentId,
        instanceId,
        category: args.category,
        content: args.content,
        source: 'agent',
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            { noteId: note.id, createdAt: note.createdAt },
            null,
            2,
          ),
        },
      ],
    };
  },
};
