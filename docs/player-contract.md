# Video Player Contract

## Overview

The student video player must handle two streams: **video** (no audio) and **audio** (no video), served as separate `googlevideo.com` direct URLs. The player synchronizes them client-side.

## API

### `POST /api/elements/:id/stream`

Returns one of four response `kind` values:

| `kind` | Status | Meaning |
|---|---|---|
| `bundle` | 200 | Ready to play. Contains stream URLs. |
| `preparing` | 202 | Bundle being generated. Poll `GET /api/elements/:id/job` every 2s. |
| `uploading` | 409 | Video still uploading to cloud. Poll `/job` endpoint. |
| `failed` | 409 | Upload/processing failed. Show `error` message. |

### `GET /api/elements/:id/job`

Returns `{ jobId, state, error? }` where `state` is:

| `state` | Meaning |
|---|---|
| `pending` | Upload queued |
| `processing` | Upload in progress |
| `ready` | Ready (bundle exists) |
| `failed` | Failed (show `error`) |

## Bundle shape

```ts
{
  kind: 'bundle',
  bundle: {
    elementId: string,
    expiresAt: string,            // ISO date
    preferredContainer: 'mp4' | 'webm',
    qualities: [
      {
        quality: '1080p',
        height: 1080,
        width: 1920,
        container: 'mp4',
        videoUrl: 'https://rr3---sn-...googlevideo.com/videoplayback?...',
        audioUrl: 'https://rr3---sn-...googlevideo.com/videoplayback?...',
        expiresAt: string
      },
      // ... more qualities sorted desc by height
    ]
  }
}
```

## Player implementation guidelines

### HTML structure
```html
<video id="player-video" controls playsinline></video>
<audio id="player-audio" preload="auto"></audio>
```

Both elements are hidden from view — video is visible, audio invisible.

### Synchronization strategy

- **Audio is the master clock.** Audio playback is more stable than video.
- On each `timeupdate` (250ms), if `|audio.currentTime - video.currentTime| > 80ms`, seek video to match audio.
- Use `requestVideoFrameCallback` for tighter sync if needed.
- Audio must start slightly *before* video to avoid initial gap.

### Quality switching

- To switch quality, `video.src = newQualities[i].videoUrl` then `video.play()`.
- Do **not** change `audio.src` — audio is shared across all qualities.
- Maintain current playback position by tracking `audio.currentTime` before switch, seek after.

### CORS

- `googlevideo.com` URLs support cross-origin range requests.
- If CORS fails, a backend proxy will be added (not in MVP).

### Bundle expiry

- Bundles expire after **5 hours**. If the player detects `expiresAt < now`, fetch a fresh bundle via `POST /stream`.
- If `POST /stream` returns `kind: 'preparing'`, show loading overlay and poll.
- Prefetch a new bundle when remaining TTL < 30 minutes.

### Error states

| UI State | Condition | User copy |
|---|---|---|
| Uploading | `kind: 'uploading'` | "Your video is being prepared. You can leave this page — we'll notify you when it's ready." |
| Preparing | `kind: 'preparing'` | Indeterminate spinner |
| Failed | `kind: 'failed'` | Error message from API |
| Ready | `kind: 'bundle'` | Show player with controls |

### Polling

- Poll `GET /api/elements/:id/job` every **2 seconds** whenever state is `uploading` or `preparing`.
- Stop polling when state transitions to `ready` or `failed`.
