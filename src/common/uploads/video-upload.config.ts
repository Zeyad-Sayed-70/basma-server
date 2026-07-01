import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';

const MAX_VIDEO_SIZE_BYTES = parseInt(
  process.env.MAX_VIDEO_UPLOAD_BYTES ?? '4294967296',
  10,
);

function generateId(): string {
  return randomBytes(12).toString('hex');
}

export const videoDiskStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const dir = join(process.cwd(), 'tmp', 'uploads');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname) || '.mp4';
    cb(null, `${generateId()}${ext}`);
  },
});

export const videoFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) => {
  const allowed = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        `Unsupported video format: ${file.mimetype}. Allowed: mp4, webm, ogg, mov, avi, mkv`,
      ),
      false,
    );
  }
};

export { MAX_VIDEO_SIZE_BYTES };
