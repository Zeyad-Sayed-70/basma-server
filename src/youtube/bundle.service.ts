import { Injectable, Logger } from '@nestjs/common';
import { YtFormat, YtdlpService } from './ytdlp.service';

const QUALITY_BUCKETS = [
  { label: '144p', maxHeight: 144 },
  { label: '240p', maxHeight: 240 },
  { label: '360p', maxHeight: 360 },
  { label: '480p', maxHeight: 480 },
  { label: '720p', maxHeight: 720 },
  { label: '1080p', maxHeight: 1080 },
  { label: '1440p', maxHeight: 1440 },
  { label: '2160p', maxHeight: 2160 },
];

const AUDIO_CODEC_PREF = ['opus', 'aac', 'mp4a', 'vorbis'];

export interface VideoBundle {
  quality: string;
  container: 'mp4' | 'webm';
  height: number;
  width: number;
  videoUrl: string;
  audioUrl: string;
  expiresAt: string;
  bitrateVideo: number;
  bitrateAudio: number;
}

export interface BundleBuildResult {
  bundles: VideoBundle[];
  expiresAt: Date;
  preferredContainer: 'mp4' | 'webm';
}

@Injectable()
export class BundleService {
  private readonly logger = new Logger(BundleService.name);

  constructor(private readonly ytdlp: YtdlpService) {}

  async build(youtubeUrl: string): Promise<BundleBuildResult> {
    const info = await this.ytdlp.getVideoInfo(youtubeUrl);
    const formats = info.formats;

    const direct = (f: YtFormat) => f.protocol?.startsWith('http');

    const mp4Video = formats.filter(
      (f) =>
        f.ext === 'mp4' &&
        f.vcodec &&
        f.vcodec !== 'none' &&
        f.width &&
        f.height &&
        f.url &&
        direct(f),
    );
    const webmVideo = formats.filter(
      (f) =>
        f.ext === 'webm' &&
        f.vcodec &&
        f.vcodec !== 'none' &&
        f.width &&
        f.height &&
        f.url &&
        direct(f),
    );
    const allAudio = formats.filter(
      (f) =>
        f.acodec &&
        f.acodec !== 'none' &&
        (!f.vcodec || f.vcodec === 'none') &&
        f.url &&
        direct(f),
    );
    const bestAudio = this.pickBestAudio(
      allAudio,
      mp4Video.length > 0 ? 'mp4' : 'webm',
    );
    if (!bestAudio) {
      this.logger.warn('bundle.no_audio_found');
    }

    const containers: Array<'mp4' | 'webm'> = ['mp4', 'webm'];
    const bundles: VideoBundle[] = [];

    for (const cont of containers) {
      const sourceFormats = cont === 'mp4' ? mp4Video : webmVideo;
      const audioForCont = bestAudio ?? this.pickBestAudio(allAudio, cont);

      for (const bucket of QUALITY_BUCKETS) {
        const candidates = sourceFormats
          .filter((f) => f.height! <= bucket.maxHeight)
          .sort((a, b) => (b.tbr ?? 0) - (a.tbr ?? 0));

        if (candidates.length === 0) continue;

        const picked = candidates[0];
        bundles.push({
          quality: bucket.label,
          container: cont,
          height: picked.height!,
          width: picked.width!,
          videoUrl: picked.url,
          audioUrl: audioForCont?.url ?? '',
          expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          bitrateVideo: picked.tbr ?? 0,
          bitrateAudio: audioForCont?.tbr ?? 0,
        });
      }
    }

    bundles.sort((a, b) => b.height - a.height);

    const preferredContainer: 'mp4' | 'webm' =
      mp4Video.length > 0 ? 'mp4' : 'webm';

    this.logger.log(
      `bundle.pairs_selected count=${bundles.length} container=${preferredContainer}`,
    );

    const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000);

    return { bundles, expiresAt, preferredContainer };
  }

  private pickBestAudio(
    audioFormats: YtFormat[],
    preferredExt: string,
  ): YtFormat | null {
    const sameContainer = audioFormats
      .filter((f) => f.ext === preferredExt)
      .sort((a, b) => (b.tbr ?? 0) - (a.tbr ?? 0));
    if (sameContainer.length > 0) return sameContainer[0];

    for (const codec of AUDIO_CODEC_PREF) {
      const match = audioFormats
        .filter((f) => (f.acodec ?? '').includes(codec))
        .sort((a, b) => (b.tbr ?? 0) - (a.tbr ?? 0));
      if (match.length > 0) return match[0];
    }

    return audioFormats.sort((a, b) => (b.tbr ?? 0) - (a.tbr ?? 0))[0] ?? null;
  }
}
