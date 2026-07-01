export class StreamBundleResponseDto {
  elementId: string;
  expiresAt: string;
  preferredContainer: 'mp4' | 'webm';
  qualities: VideoQualityDto[];
}

export class VideoQualityDto {
  quality: string;
  height: number;
  width: number;
  container: 'mp4' | 'webm';
  videoUrl: string;
  audioUrl: string;
  expiresAt: string;
}

export type StreamResponseDto =
  | { kind: 'bundle'; bundle: StreamBundleResponseDto }
  | { kind: 'preparing' }
  | { kind: 'uploading' }
  | { kind: 'failed'; error: string };
