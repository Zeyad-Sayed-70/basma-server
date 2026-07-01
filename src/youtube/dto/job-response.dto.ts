export enum JobDisplayState {
  PENDING = 'pending',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

export class VideoJobResponseDto {
  jobId: string;
  state: JobDisplayState;
  error?: string;

  static from(job: {
    id: string;
    status: string;
    youtubeVideoId?: string | null;
    bundleJson?: unknown;
    error?: string | null;
  }): VideoJobResponseDto {
    let state: JobDisplayState;
    if (job.status === 'COMPLETED' && job.bundleJson) {
      state = JobDisplayState.READY;
    } else if (job.status === 'FAILED') {
      state = JobDisplayState.FAILED;
    } else if (job.status === 'CANCELLED') {
      state = JobDisplayState.FAILED;
    } else if (job.status === 'PROCESSING') {
      state = JobDisplayState.PROCESSING;
    } else {
      state = JobDisplayState.PENDING;
    }

    return {
      jobId: job.id,
      state,
      error: job.error ?? undefined,
    };
  }
}
