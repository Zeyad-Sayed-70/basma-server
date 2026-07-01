export interface StreamBundleResponse {
  elementId: string;
  expiresAt: string;
  preferredContainer: 'mp4' | 'webm';
  qualities: VideoQuality[];
}

export interface VideoQuality {
  quality:
    | '144p'
    | '240p'
    | '360p'
    | '480p'
    | '720p'
    | '1080p'
    | '1440p'
    | '2160p';
  height: number;
  width: number;
  container: 'mp4' | 'webm';
  videoUrl: string;
  audioUrl: string;
  expiresAt: string;
}

export type StreamResponse =
  | { kind: 'bundle'; bundle: StreamBundleResponse }
  | { kind: 'preparing' }
  | { kind: 'uploading' }
  | { kind: 'failed'; error: string };

export interface JobResponse {
  jobId: string;
  state: 'pending' | 'processing' | 'ready' | 'failed';
  error?: string;
}
