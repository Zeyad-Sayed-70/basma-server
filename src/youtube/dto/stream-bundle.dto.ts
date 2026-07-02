import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VideoQualityDto {
  @ApiProperty({ example: '1080p' })
  quality: string;

  @ApiProperty({ example: 1080 })
  height: number;

  @ApiProperty({ example: 1920 })
  width: number;

  @ApiProperty({ example: 'mp4' })
  container: 'mp4' | 'webm';

  @ApiProperty({ example: 'https://rr1---sn.c.youtube.com/videoplayback?...' })
  videoUrl: string;

  @ApiProperty({ example: 'https://rr1---sn.c.youtube.com/videoplayback?...' })
  audioUrl: string;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  expiresAt: string;
}

export class StreamBundleResponseDto {
  @ApiProperty({ example: 'clx...' })
  elementId: string;

  @ApiProperty({ example: '2025-01-15T15:00:00.000Z' })
  expiresAt: string;

  @ApiProperty({ example: 'mp4' })
  preferredContainer: 'mp4' | 'webm';

  @ApiProperty({ type: [VideoQualityDto] })
  qualities: VideoQualityDto[];
}

export class StreamFailedDto {
  @ApiProperty({ example: 'failed' })
  kind: string;

  @ApiProperty({ example: 'Upload failed' })
  error: string;
}

export type StreamResponseDto =
  | { kind: 'bundle'; bundle: StreamBundleResponseDto }
  | { kind: 'preparing' }
  | { kind: 'uploading' }
  | { kind: 'failed'; error: string };
