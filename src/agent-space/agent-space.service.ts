import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentSpaceService {
  constructor(private readonly prisma: PrismaService) {}

  async createFile(
    instanceId: string,
    filename: string,
    content: string,
    fileType: string,
  ) {
    const existing = await this.prisma.agentSpaceFile.findUnique({
      where: { instanceId_filename: { instanceId, filename } },
    });
    if (existing) {
      throw new ConflictException(`File "${filename}" already exists`);
    }

    return this.prisma.agentSpaceFile.create({
      data: {
        filename,
        content,
        fileType,
        fileSize: Buffer.byteLength(content, 'utf-8'),
        instanceId,
      },
    });
  }

  async listFiles(instanceId: string, limit = 50, offset = 0) {
    const [files, total] = await Promise.all([
      this.prisma.agentSpaceFile.findMany({
        where: { instanceId },
        select: {
          id: true,
          filename: true,
          fileType: true,
          fileSize: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.agentSpaceFile.count({ where: { instanceId } }),
    ]);
    return { files, total };
  }

  async getFile(instanceId: string, fileId: string) {
    const file = await this.prisma.agentSpaceFile.findFirst({
      where: { id: fileId, instanceId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async updateFile(instanceId: string, fileId: string, content: string) {
    const file = await this.prisma.agentSpaceFile.findFirst({
      where: { id: fileId, instanceId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return this.prisma.agentSpaceFile.update({
      where: { id: fileId },
      data: {
        content,
        fileSize: Buffer.byteLength(content, 'utf-8'),
      },
    });
  }

  async deleteFile(instanceId: string, fileId: string) {
    const file = await this.prisma.agentSpaceFile.findFirst({
      where: { id: fileId, instanceId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    await this.prisma.agentSpaceFile.delete({ where: { id: fileId } });
  }

  async searchContent(instanceId: string, query: string, limit = 20) {
    const files = await this.prisma.agentSpaceFile.findMany({
      where: {
        instanceId,
        content: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        filename: true,
        content: true,
      },
      take: limit,
    });

    return files.map((f) => {
      const lines = f.content.split('\n');
      const matches = lines
        .map((line, index) => {
          const lowerLine = line.toLowerCase();
          const lowerQuery = query.toLowerCase();
          const idx = lowerLine.indexOf(lowerQuery);
          if (idx === -1) return null;
          return {
            lineNumber: index + 1,
            line: line.substring(
              Math.max(0, idx - 40),
              idx + query.length + 40,
            ),
            highlightStart: idx,
            highlightEnd: idx + query.length,
          };
        })
        .filter(Boolean);

      return { fileId: f.id, filename: f.filename, matches };
    });
  }
}
