import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';

export interface YtFormat {
  format_id: string;
  ext: string;
  quality?: string;
  resolution?: string;
  width?: number;
  height?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  tbr?: number;
  has_drm?: boolean;
  protocol?: string;
  url: string;
  http_headers?: Record<string, string>;
}

export interface YtVideoInfo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration: number;
  uploader?: string;
  upload_date?: string;
  view_count?: number;
  formats: YtFormat[];
}

@Injectable()
export class YtdlpService {
  private readonly logger = new Logger(YtdlpService.name);
  private readonly cookiesPath: string;

  constructor(private readonly config: ConfigService) {
    this.cookiesPath =
      this.config.get<string>('YT_COOKIES_FILE') ??
      path.join(process.cwd(), 'data', 'yt-cookies.txt');
  }

  private getCookiesArg(): string[] {
    if (fs.existsSync(this.cookiesPath)) {
      return ['--cookies', this.cookiesPath];
    }
    const browser = this.config.get<string>('YT_BROWSER_COOKIES');
    if (browser) {
      return ['--cookies-from-browser', browser];
    }
    return [];
  }

  private denoPathEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    const home = os.homedir();
    const denoBin = path.join(home, 'deno', 'bin');
    if (fs.existsSync(denoBin)) {
      const pathKey =
        Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
      env[pathKey] = `${denoBin}${path.delimiter}${env[pathKey] ?? ''}`;
    }
    return env;
  }

  private runYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = execFile(
        'yt-dlp',
        args,
        {
          maxBuffer: 10 * 1024 * 1024,
          env: this.denoPathEnv(),
        },
        (err, stdout, stderr) => {
          if (err) {
            const msg = (stderr || err.message || '').trim();
            reject(new Error(msg || 'yt-dlp failed'));
            return;
          }
          resolve(stdout);
        },
      );
      child.on('error', (e) => reject(e));
    });
  }

  async getVideoInfo(url: string): Promise<YtVideoInfo> {
    const cookies = this.getCookiesArg();
    const args = [
      '--dump-json',
      '--skip-download',
      '--no-warnings',
      ...cookies,
      url,
    ];

    this.logger.log(`ytdlp.get_video_info url=${url}`);
    const stdout = await this.runYtDlp(args);
    const raw = JSON.parse(stdout);

    const formats: YtFormat[] = (raw.formats ?? [])
      .filter(
        (f: Record<string, unknown>) =>
          f.url && typeof f.url === 'string' && f.url.startsWith('http'),
      )
      .map((f: Record<string, unknown>) => ({
        format_id: String(f.format_id ?? ''),
        ext: String(f.ext ?? ''),
        quality: f.quality ? String(f.quality) : undefined,
        resolution: f.resolution ? String(f.resolution) : undefined,
        width: f.width ? Number(f.width) : undefined,
        height: f.height ? Number(f.height) : undefined,
        fps: f.fps ? Number(f.fps) : undefined,
        vcodec: f.vcodec ? String(f.vcodec) : undefined,
        acodec: f.acodec ? String(f.acodec) : undefined,
        filesize: f.filesize ? Number(f.filesize) : undefined,
        tbr: f.tbr ? Number(f.tbr) : undefined,
        has_drm: !!f.has_drm,
        protocol: f.protocol ? String(f.protocol) : undefined,
        url: (f.url as string).replace(/\\u0026/g, '&'),
        http_headers: f.http_headers as Record<string, string> | undefined,
      }));

    this.logger.log(
      `ytdlp.formats_parsed video=${formats.filter((f) => f.vcodec !== 'none' && f.vcodec).length} audio=${formats.filter((f) => f.acodec !== 'none' && f.acodec).length}`,
    );

    return {
      id: String(raw.id ?? ''),
      title: String(raw.title ?? ''),
      description: raw.description ? String(raw.description) : undefined,
      thumbnail: raw.thumbnail ? String(raw.thumbnail) : undefined,
      duration: Number(raw.duration ?? 0),
      uploader: raw.uploader ? String(raw.uploader) : undefined,
      upload_date: raw.upload_date ? String(raw.upload_date) : undefined,
      view_count: raw.view_count ? Number(raw.view_count) : undefined,
      formats,
    };
  }
}
