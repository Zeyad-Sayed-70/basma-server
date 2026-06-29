import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { TenantContext } from '../common/context/tenant-context';
import { CreateVideoElementDto } from './dto/create-video-element.dto';
import { CreateFileElementDto } from './dto/create-file-element.dto';
import { CreateRichContentDto } from './dto/create-rich-content.dto';
import { UpdateElementDto } from './dto/update-element.dto';
import { ReorderDto } from './dto/reorder.dto';
import { validateRichContent } from './rich-content.util';
import type { CurriculumElementType } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class ElementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  private async assertCurriculumAccess(id: string, instanceId: string) {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id, instanceId },
    });
    if (!curriculum) throw new NotFoundException('Curriculum not found');
    return curriculum;
  }

  async addVideo(
    curriculumId: string,
    dto: CreateVideoElementDto,
    file: Express.Multer.File,
  ) {
    const instanceId = this.getInstanceId();
    await this.assertCurriculumAccess(curriculumId, instanceId);

    const cuid = this.generateId();
    const ext = file.originalname.split('.').pop() ?? 'mp4';
    const objectPath = `curriculum/videos/${instanceId}/${cuid}/${cuid}.${ext}`;

    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const videoUrl = this.minio.getObjectUrl(objectPath);

    const maxPosition = await this.getMaxPosition(curriculumId);

    const video = await this.prisma.curriculumVideo.create({
      data: {
        curriculumId,
        instanceId,
        title: dto.title,
        description: dto.description,
        videoUrl,
        fileObjectKey: objectPath,
        mimeType: file.mimetype,
        fileSize: file.buffer.length,
        durationSeconds: dto.durationSeconds ?? null,
      },
    });

    const element = await this.prisma.curriculumElement.create({
      data: {
        curriculumId,
        instanceId,
        type: 'VIDEO',
        title: dto.title,
        position: maxPosition + 1000,
        videoId: video.id,
      },
      include: { video: true },
    });

    return element;
  }

  async addFile(
    curriculumId: string,
    dto: CreateFileElementDto,
    file: Express.Multer.File,
  ) {
    const instanceId = this.getInstanceId();
    await this.assertCurriculumAccess(curriculumId, instanceId);

    const cuid = this.generateId();
    const objectPath = `curriculum/files/${instanceId}/${cuid}/${file.originalname}`;

    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const fileUrl = this.minio.getObjectUrl(objectPath);

    const maxPosition = await this.getMaxPosition(curriculumId);

    const curriculumFile = await this.prisma.curriculumFile.create({
      data: {
        curriculumId,
        instanceId,
        title: dto.title,
        description: dto.description,
        filename: file.originalname,
        fileUrl,
        fileObjectKey: objectPath,
        mimeType: file.mimetype,
        fileSize: file.buffer.length,
      },
    });

    const element = await this.prisma.curriculumElement.create({
      data: {
        curriculumId,
        instanceId,
        type: 'FILE',
        title: dto.title,
        position: maxPosition + 1000,
        fileId: curriculumFile.id,
      },
      include: { file: true },
    });

    return element;
  }

  async addRichContent(curriculumId: string, dto: CreateRichContentDto) {
    const instanceId = this.getInstanceId();
    await this.assertCurriculumAccess(curriculumId, instanceId);

    validateRichContent(dto.bodyJson);

    const maxPosition = await this.getMaxPosition(curriculumId);

    const richContent = await this.prisma.curriculumRichContent.create({
      data: {
        curriculumId,
        instanceId,
        title: dto.title,
        bodyJson: dto.bodyJson as Prisma.InputJsonValue,
      },
    });

    const element = await this.prisma.curriculumElement.create({
      data: {
        curriculumId,
        instanceId,
        type: 'RICH_CONTENT',
        title: dto.title,
        position: maxPosition + 1000,
        richContentId: richContent.id,
      },
      include: { richContent: true },
    });

    return element;
  }

  async attachQuiz(curriculumId: string, quizId: string) {
    return this.attachExisting(curriculumId, quizId, 'QUIZ');
  }

  async attachAssignment(curriculumId: string, assignmentId: string) {
    return this.attachExisting(curriculumId, assignmentId, 'ASSIGNMENT');
  }

  async attachSession(curriculumId: string, sessionId: string) {
    return this.attachExisting(curriculumId, sessionId, 'SESSION');
  }

  private async attachExisting(
    curriculumId: string,
    refId: string,
    type: CurriculumElementType,
  ) {
    const instanceId = this.getInstanceId();
    await this.assertCurriculumAccess(curriculumId, instanceId);

    let entity: { id: string; title: string } | null = null;
    const data: Record<string, unknown> = {
      curriculumId,
      instanceId,
      type,
      position: 0,
    };

    const maxPosition = await this.getMaxPosition(curriculumId);
    data.position = maxPosition + 1000;

    if (type === 'QUIZ') {
      entity = await this.prisma.quiz.findFirst({
        where: { id: refId, instanceId },
        select: { id: true, title: true },
      });
      if (entity) data.quizId = refId;
    } else if (type === 'ASSIGNMENT') {
      entity = await this.prisma.assignment.findFirst({
        where: { id: refId, instanceId },
        select: { id: true, title: true },
      });
      if (entity) data.assignmentId = refId;
    } else if (type === 'SESSION') {
      entity = await this.prisma.session.findFirst({
        where: { id: refId, instanceId },
        select: { id: true, title: true },
      });
      if (entity) data.sessionId = refId;
    }

    if (!entity) {
      throw new NotFoundException(`${type.toLowerCase()} not found`);
    }

    data.title = entity.title;

    return this.prisma.curriculumElement.create({ data } as never);
  }

  async update(id: string, dto: UpdateElementDto) {
    const instanceId = this.getInstanceId();
    const element = await this.prisma.curriculumElement.findFirst({
      where: { id, instanceId },
    });
    if (!element) throw new NotFoundException('Element not found');

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.required !== undefined) data.required = dto.required;

    if (element.type === 'RICH_CONTENT' && dto.bodyJson !== undefined) {
      validateRichContent(dto.bodyJson);
      await this.prisma.curriculumRichContent.update({
        where: { id: element.richContentId! },
        data: { bodyJson: dto.bodyJson as Prisma.InputJsonValue },
      });
    }

    if (element.type === 'VIDEO' && dto.description !== undefined) {
      await this.prisma.curriculumVideo.update({
        where: { id: element.videoId! },
        data: { description: dto.description },
      });
    }

    if (element.type === 'FILE' && dto.fileDescription !== undefined) {
      await this.prisma.curriculumFile.update({
        where: { id: element.fileId! },
        data: { description: dto.fileDescription },
      });
    }

    return this.prisma.curriculumElement.update({
      where: { id },
      data,
      include: {
        video: true,
        richContent: true,
        file: true,
        quiz: { select: { id: true, title: true } },
        assignment: { select: { id: true, title: true } },
        session: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            type: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const element = await this.prisma.curriculumElement.findFirst({
      where: { id, instanceId },
      include: {
        video: { select: { fileObjectKey: true } },
        file: { select: { fileObjectKey: true } },
      },
    });
    if (!element) throw new NotFoundException('Element not found');

    if (element.video?.fileObjectKey) {
      try {
        await this.minio.deleteObject(element.video.fileObjectKey);
      } catch {
        /* best-effort */
      }
    }

    if (element.file?.fileObjectKey) {
      try {
        await this.minio.deleteObject(element.file.fileObjectKey);
      } catch {
        /* best-effort */
      }
    }

    await this.prisma.curriculumElement.delete({ where: { id } });
  }

  async replaceVideo(id: string, file: Express.Multer.File) {
    const instanceId = this.getInstanceId();
    const element = await this.prisma.curriculumElement.findFirst({
      where: { id, instanceId, type: 'VIDEO' },
      include: { video: true },
    });
    if (!element?.video) throw new NotFoundException('Video element not found');

    if (element.video.fileObjectKey) {
      try {
        await this.minio.deleteObject(element.video.fileObjectKey);
      } catch {
        /* best-effort */
      }
    }

    const ext = file.originalname.split('.').pop() ?? 'mp4';
    const objectPath = `curriculum/videos/${instanceId}/${element.id}/${element.id}.${ext}`;
    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const videoUrl = this.minio.getObjectUrl(objectPath);

    return this.prisma.curriculumVideo.update({
      where: { id: element.video.id },
      data: {
        videoUrl,
        fileObjectKey: objectPath,
        mimeType: file.mimetype,
        fileSize: file.buffer.length,
      },
    });
  }

  async replaceFile(id: string, file: Express.Multer.File) {
    const instanceId = this.getInstanceId();
    const element = await this.prisma.curriculumElement.findFirst({
      where: { id, instanceId, type: 'FILE' },
      include: { file: true },
    });
    if (!element?.file) throw new NotFoundException('File element not found');

    if (element.file.fileObjectKey) {
      try {
        await this.minio.deleteObject(element.file.fileObjectKey);
      } catch {
        /* best-effort */
      }
    }

    const objectPath = `curriculum/files/${instanceId}/${element.id}/${file.originalname}`;
    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const fileUrl = this.minio.getObjectUrl(objectPath);

    return this.prisma.curriculumFile.update({
      where: { id: element.file.id },
      data: {
        filename: file.originalname,
        fileUrl,
        fileObjectKey: objectPath,
        mimeType: file.mimetype,
        fileSize: file.buffer.length,
      },
    });
  }

  async uploadImage(curriculumId: string, file: Express.Multer.File) {
    const instanceId = this.getInstanceId();
    await this.assertCurriculumAccess(curriculumId, instanceId);

    const cuid = this.generateId();
    const objectPath = `curriculum/images/${instanceId}/${cuid}/${file.originalname}`;
    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const fileUrl = this.minio.getObjectUrl(objectPath);

    const image = await this.prisma.curriculumImage.create({
      data: {
        curriculumId,
        instanceId,
        fileUrl,
        fileObjectKey: objectPath,
        mimeType: file.mimetype,
        fileSize: file.buffer.length,
      },
    });

    return {
      id: image.id,
      fileUrl: image.fileUrl,
      fileObjectKey: image.fileObjectKey,
    };
  }

  async reorder(curriculumId: string, dto: ReorderDto) {
    const instanceId = this.getInstanceId();
    await this.assertCurriculumAccess(curriculumId, instanceId);

    const existing = await this.prisma.curriculumElement.findMany({
      where: { curriculumId },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((e) => e.id));
    if (dto.elementIds.length !== existing.length) {
      throw new BadRequestException(
        `Expected ${existing.length} element IDs but got ${dto.elementIds.length}`,
      );
    }

    for (const id of dto.elementIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Element ${id} does not belong to this curriculum`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.elementIds.map((elementId, index) =>
        this.prisma.curriculumElement.update({
          where: { id: elementId },
          data: { position: (index + 1) * 1000 },
        }),
      ),
    );
  }

  private async getMaxPosition(curriculumId: string): Promise<number> {
    const last = await this.prisma.curriculumElement.findFirst({
      where: { curriculumId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return last?.position ?? 0;
  }

  private generateId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
