# YouTube Video Downloader & Uploader — Full Guide

This document explains in detail how the project works: downloading both public and private YouTube videos, and uploading videos to YouTube with private status.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Downloading Videos](#downloading-videos)
   - [How It Works](#how-it-works)
   - [Public Videos](#public-videos)
   - [Private Videos](#private-videos)
   - [The Express API (server.js)](#the-express-api-serverjs)
   - [The yt-dlp Wrapper (lib/ytdlp.js)](#the-yt-dlp-wrapper-libytdlpjs)
   - [Cookies — How Auth Works](#cookies--how-auth-works)
   - [Deno as JS Runtime](#deno-as-js-runtime)
   - [Handling Errors](#handling-errors)
5. [Uploading Videos](#uploading-videos)
   - [How It Works](#how-it-works-1)
   - [Google Cloud Setup (OAuth2)](#google-cloud-setup-oauth2)
   - [The Upload Script (upload.js)](#the-upload-script-uploadjs)
   - [OAuth2 Flow Step-by-Step](#oauth2-flow-step-by-step)
   - [Upload Parameters](#upload-parameters)
   - [Setting Private Status](#setting-private-status)
6. [Quick Reference](#quick-reference)

---

## Overview

This project does two things:

1. **Download/Extract YouTube video info** — Given a YouTube URL, it uses `yt-dlp` to extract metadata and direct video stream URLs (googlevideo.com/videoplayback). Works for both public and private/unlisted videos (with cookies).
2. **Upload videos to YouTube** — Uses the YouTube Data API v3 via OAuth2 to upload a local video file to a YouTube channel, defaulting to `private` privacy status.

---

## Tech Stack

| Tool/Library | Purpose |
|---|---|
| **Node.js** | Runtime for the server and upload script |
| **Express** | HTTP server exposing the download API |
| **yt-dlp** | CLI tool that extracts YouTube video metadata and stream URLs |
| **Deno** | JavaScript runtime required by yt-dlp for signature decryption (YouTube's JS player) |
| **googleapis** (npm) | Google API client — used for YouTube Data API v3 (upload) |
| **OAuth2** | Authentication flow forYouTube upload access |
| **cookies.txt** | Netscape-format cookie file exported from browser — needed for private/restricted video access |

---

## Project Structure

```
yt/
├── server.js              # Express API server (download)
├── upload.js               # CLI script to upload videos to YouTube
├── lib/
│   └── ytdlp.js            # Wrapper around yt-dlp CLI
├── client_secret.json      # OAuth2 credentials from Google Cloud Console
├── token.json               # Stored OAuth2 access/refresh token (auto-generated)
├── cookies.txt              # Browser cookies for private video access
├── package.json
└── yt.md                    # This file
```

---

## Downloading Videos

### How It Works

Instead of downloading the entire video file to the server, the project **extracts the direct stream URLs** that YouTube uses to serve video content (hosted on `googlevideo.com`). These URLs point to the raw video/audio streams and can be used by any HTTP client or video player to download or stream the content.

The flow:

```
User sends GET /api/video?url=<youtube_url>
        │
        ▼
  server.js receives the request
        │
        ▼
  lib/ytdlp.js calls yt-dlp --dump-json --skip-download
        │
        ▼
  yt-dlp connects to YouTube, decrypts signatures,
  and returns a JSON blob with all available formats + URLs
        │
        ▼
  ytdlp.js parses the JSON, filters/cleans the formats,
  and returns structured data back to server.js
        │
        ▼
  server.js responds with JSON containing
  video metadata + array of downloadable formats with URLs
```

### Public Videos

For public videos, no authentication is needed. yt-dlp can extract stream URLs on its own by analyzing YouTube's page HTML and JavaScript player code.

**Steps yt-dlp takes internally:**

1. Fetches the YouTube watch page HTML.
2. Extracts the embedded player response data (ytInitialPlayerResponse).
3. Parses the available formats (video+audio streams at various resolutions).
4. Some stream URLs contain encrypted signatures (`s` parameter) — yt-dlp evaluates YouTube's JavaScript player code (using Deno) to decrypt them into playable `n` and `sig` parameters.
5. Returns all formats with their direct `googlevideo.com/videoplayback?...` URLs.

**Example API call:**

```bash
curl "http://localhost:3001/api/video?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**Example response (abbreviated):**

```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
  "duration": 213,
  "uploader": "Rick Astley",
  "formats": [
    {
      "format_id": "137",
      "ext": "mp4",
      "resolution": "1920x1080",
      "fps": 30,
      "vcodec": "avc1.640028",
      "acodec": null,
      "url": "https://rr3---sn-xxx.googlevideo.com/videoplayback?expire=...&signature=..."
    },
    {
      "format_id": "251",
      "ext": "webm",
      "resolution": "audio only",
      "acodec": "opus",
      "url": "https://rr3---sn-xxx.googlevideo.com/videoplayback?expire=...&signature=..."
    }
  ]
}
```

You can then use any of the `url` fields to download the stream directly:

```bash
curl -o video.mp4 "<url_from_response>"
```

Note: Most YouTube formats separate video and audio into different streams. For a complete file you'd need to merge them (e.g., with `ffmpeg`), or use `yt-dlp` directly to download and merge.

### Private Videos

Private or age-restricted videos require authentication — YouTube won't serve them to anonymous requests. The project handles this by passing **browser cookies** to yt-dlp.

**Why cookies are needed:**

- Private videos check whether the requesting user has access (i.e., is the uploader or on the allowed list).
- Age-restricted videos require the user to be signed in and have age verification.
- Geo-blocked or member-only videos also need authenticated sessions.
- YouTube validates the session via cookies like `SID`, `HSID`, `SSID`, `APISID`, `SAPISID`, `LOGIN_INFO`, and `__Secure-1PSID`.

**How to get cookies:**

1. Log into YouTube in your browser (Chrome/Firefox/Edge).
2. Use a cookie export extension (e.g., "Get cookies.txt LOCALLY" for Chrome) to export cookies for `youtube.com` in Netscape format.
3. Save the exported file as `cookies.txt` in the project root.

**The cookies.txt format (Netscape):**

```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	TRUE	1234567890	SID	<value>
.youtube.com	TRUE	/	TRUE	1234567890	HSID	<value>
.youtube.com	TRUE	/	TRUE	1234567890	SSID	<value>
...
```

Each line is: `domain  include_subdomains  path  secure  expiration  name  value` (tab-separated).

**Alternative: reading directly from the browser:**

Instead of exporting a `cookies.txt`, you can pass the `--cookies-from-browser` flag via the `BROWSER_COOKIES` environment variable:

```bash
BROWSER_COOKIES=chrome node server.js
```

This tells yt-dlp to read cookies directly from the browser's cookie store. Supported values: `chrome`, `firefox`, `edge`, `brave`, `opera`, etc. On Windows, this may require the browser to be closed.

### The Express API (server.js)

The server is a minimal Express app with two routes:

| Route | Description |
|---|---|
| `GET /` | Shows API info and auth status |
| `GET /api/video?url=<youtube_url>` | Extracts video info and stream URLs |

**Key logic in `server.js`:**

- On startup, it checks whether `cookies.txt` exists (or `BROWSER_COOKIES` is set) and logs the auth status.
- The `/api/video` endpoint validates the `url` query parameter, then delegates to `lib/ytdlp.js`'s `getVideoInfo()`.
- Error handling maps yt-dlp errors to appropriate HTTP status codes:
  - `Private video` / `Sign in` → 403 (cookies missing or expired)
  - `Video unavailable` → 404
  - `Requested format is not available` → 502
  - `HTTP Error 403` → 403 (age-restricted / geo-blocked / PO token needed)
  - Other errors → 500

### The yt-dlp Wrapper (lib/ytdlp.js)

This module provides a Promise-based wrapper around the `yt-dlp` CLI.

**`ytDlp(args, env)`** — Core function:

- Uses Node.js `child_process.execFile` to run `yt-dlp` with the given arguments.
- Sets `maxBuffer` to 10 MB to handle large JSON outputs.
- Returns a Promise that resolves with stdout or rejects with stderr.

**`getVideoInfo(url, cookiesPath, browserCookies)`** — Main export:

1. Builds the argument list:
   - `--dump-json` — Tells yt-dlp to output all metadata as JSON (no download).
   - `--skip-download` — Don't actually download the video file.
   - `--no-warnings` — Suppress warning output.
   - `--cookies <path>` or `--cookies-from-browser <browser>` — If cookies are available.
   - The YouTube URL as the final argument.

2. **Deno PATH injection:** YouTube's player JavaScript uses modern JS features (like optional chaining, nullish coalescing) that Node.js's built-in engine can't handle. yt-dlp uses Deno to evaluate this JS. The `denoPath()` function locates Deno's binary directory (`~/deno/bin`) and prepends it to the `PATH` environment variable so yt-dlp can find it.

3. Calls `ytDlp()` with the args and modified env.

4. Parses the returned JSON and transforms the `formats` array:
   - **Filters** — Only keeps formats that have an HTTP URL (`f.url && f.url.startsWith('http')`).
   - **Cleans** — Maps each format to a clean object with: `format_id`, `ext`, `quality`, `resolution`, `width`, `height`, `fps`, `vcodec`, `acodec`, `filesize`, `tbr`, `has_drm`, `protocol`, `url`, `http_headers`.
   - **URL fix** — Replaces `\u0026` (Unicode-escaped ampersands) with literal `&` in URLs.

5. Returns an object with: `id`, `title`, `description`, `thumbnail`, `duration`, `uploader`, `upload_date`, `view_count`, `formats`.

### Cookies — How Auth Works

The cookie authentication chain:

```
Browser session (logged into YouTube)
        │
        ▼  Export via extension OR --cookies-from-browser
  cookies.txt (Netscape format)
        │
        ▼  Passed to yt-dlp via --cookies flag
  yt-dlp sends cookies in HTTP requests to YouTube
        │
        ▼  YouTube validates the session
  Returns private/restricted video data
```

**Critical cookies that must be present:**

| Cookie | Purpose |
|---|---|
| `SID` | Session ID — primary session identifier |
| `HSID` | Host session ID — tied to the Google account |
| `SSID` | Secure session ID — used over HTTPS |
| `APISID` | API session ID — for YouTube API calls |
| `SAPISID` | Secure API session ID — for authenticated API calls |
| `LOGIN_INFO` | Login information — indicates the user is signed in |
| `__Secure-1PSID` | Secure PSID — additional session security |

If any of these are missing, yt-dlp may fail to access private videos. The server detects this and returns a 403 with a hint about which cookies are required.

**Important notes:**

- Cookies expire. If yt-dlp suddenly stops being able to access private videos, re-export `cookies.txt`.
- The `cookies.txt` file contains sensitive session data — **never commit it to git** or share it publicly.
- `BROWSER_COOKIES` is more convenient but requires the browser to not be running (on some OSes) since it reads the browser's SQLite cookie database directly.

### Deno as JS Runtime

YouTube obfuscates its video stream URLs by encrypting the signature parameter. To decrypt it, yt-dlp needs to execute YouTube's JavaScript player code. This code uses modern JavaScript syntax that Node.js's built-in JavaScript engine (used by yt-dlp's PhantomJS/older engines) cannot parse.

**Deno** is a modern JavaScript/TypeScript runtime (by Ryan Dahl, creator of Node.js) that supports the latest JS features. yt-dlp uses it as a JS interpreter to evaluate YouTube's player code.

**How it's configured in this project:**

- Deno is installed to `~/deno/bin/` (Windows: `%USERPROFILE%\deno\bin\`).
- `lib/ytdlp.js` has a `denoPath()` function that checks for this directory.
- If found, it prepends Deno's bin directory to the `PATH` environment variable before spawning yt-dlp.
- yt-dlp auto-detects Deno on PATH and uses it instead of its built-in engine.

If Deno is not available, yt-dlp falls back to its built-in JS engine, which may fail on videos with newer signature algorithms, resulting in `Requested format is not available` errors.

### Handling Errors

The server maps yt-dlp error messages to HTTP responses:

| Error Pattern | HTTP Status | Meaning |
|---|---|---|
| `Private video` / `Sign in` | 403 | Video is private and no valid cookies were provided |
| `Video unavailable` | 404 | Video doesn't exist or was deleted |
| `Requested format is not available` | 502 | yt-dlp couldn't decrypt signatures (update yt-dlp/Deno) |
| `HTTP Error 403` | 403 | Access forbidden (age-restricted, geo-blocked, PO token) |
| Anything else | 500 | Unexpected error |

---

## Uploading Videos

### How It Works

The upload script (`upload.js`) uses the **YouTube Data API v3** with **OAuth2 authentication** to upload a video file from your local machine to your YouTube channel. By default, videos are uploaded as **private**.

The flow:

```
User runs: node upload.js video.mp4 "Title" "Description" private
        │
        ▼
  upload.js loads OAuth2 credentials from client_secret.json
        │
        ▼
  Checks if token.json exists (saved auth)
    ├── Yes → loads saved token
    └── No  → opens browser for OAuth2 consent flow
              │
              ▼
         User grants permission in browser
              │
              ▼
         Authorization code is exchanged for tokens
              │
              ▼
         Tokens saved to token.json for future use
        │
        ▼
  Creates YouTube API client with auth
        │
        ▼
  Uploads video via youtube.videos.insert()
  with privacyStatus: "private"
        │
        ▼
  Returns video ID and upload status
```

### Google Cloud Setup (OAuth2)

Before using `upload.js`, you need a Google Cloud project with the YouTube Data API v3 enabled and OAuth2 credentials.

**Step-by-step setup:**

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project (or select an existing one).

2. **Enable the YouTube Data API v3:**
   - Navigate to "APIs & Services" → "Library".
   - Search for "YouTube Data API v3".
   - Click "Enable".

3. **Create OAuth2 credentials:**
   - Go to "APIs & Services" → "Credentials".
   - Click "Create Credentials" → "OAuth client ID".
   - Application type: **Desktop app** (or "Web application").
   - Add a redirect URI: `http://localhost` or `urn:ietf:wg:oauth:2.0:oob` (depends on your setup; the script uses the first redirect URI from the credentials file).
   - Download the credentials JSON file.
   - Rename it to `client_secret.json` and place it in the project root.

4. **Consent Screen:**
   - Go to "APIs & Services" → "OAuth consent screen".
   - Configure it (Internal or External depending on your Google Workspace).
   - Add your email as a test user if using External (unverified) mode.
   - The consent screen is what users see when the OAuth flow opens in the browser.

**The `client_secret.json` structure:**

```json
{
  "installed": {
    "client_id": "xxxx.apps.googleusercontent.com",
    "project_id": "your-project",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-xxxx",
    "redirect_uris": ["http://localhost"]
  }
}
```

The script handles both `installed` (Desktop app) and `web` credential formats.

### The Upload Script (upload.js)

The script has three main parts:

**1. `authorize()` — Handles OAuth2 authentication:**

- Reads `client_secret.json` and creates an OAuth2 client.
- If `token.json` exists (from a previous run), loads the saved access/refresh tokens and sets them on the client. No browser interaction needed.
- If `token.json` does not exist:
  - Generates an authorization URL with `access_type: 'offline'` (ensures a refresh token is returned so the script can work without repeated consent).
  - Opens the URL in the user's browser for them to grant permission.
  - Prompts the user to paste the authorization code from the redirect URL.
  - Exchanges the code for access and refresh tokens.
  - Saves the tokens to `token.json` for future use.

**2. `upload(auth, filePath, title, description, privacy)` — Handles the upload:**

- Creates a YouTube API client: `google.youtube({ version: 'v3', auth })`.
- Calls `youtube.videos.insert()` with:
  - `part: ['snippet', 'status']` — We're setting both the video metadata (title, description) and its status (privacy).
  - `notifySubscribers: false` — Don't send a notification to channel subscribers (important for private uploads).
  - `requestBody.snippet` — Title and description.
  - `requestBody.status.privacyStatus` — Privacy setting (defaults to `private`).
  - `media.body` — The video file as a readable stream (`fs.createReadStream`), which the googleapis library uploads via resumable upload automatically.

- Returns the video ID and upload status.

**3. CLI interface — Parses command-line arguments:**

```bash
node upload.js <video.mp4> [title] [description] [privacy]
```

### OAuth2 Flow Step-by-Step

Here's what happens the first time you run `upload.js`:

1. The script reads `client_secret.json` and creates an OAuth2 client.
2. It generates an authorization URL like:
   ```
   https://accounts.google.com/o/oauth2/auth?access_type=offline&scope=https://www.googleapis.com/auth/youtube.upload
   ```
3. It prints this URL and opens it. The browser shows Google's consent screen:
   - "This app wants to manage your YouTube videos."
4. You sign in and click "Allow".
5. Google redirects to the redirect URI with an authorization `code` in the URL:
   ```
   http://localhost?code=4/0AXXXX...&scope=...
   ```
6. You copy the `code` value and paste it into the terminal prompt.
7. The script exchanges the code for tokens:
   - `access_token` — Short-lived token (expires in ~1 hour).
   - `refresh_token` — Long-lived token used to get new access tokens automatically.
8. Both tokens are saved to `token.json`.
9. The script proceeds with the upload.

**On subsequent runs:** `token.json` already exists, so the script skips the browser flow entirely and uses the saved tokens. If the access token expires, the googleapis library automatically uses the refresh token to get a new one.

### Upload Parameters

| Parameter | CLI Argument | Default | Description |
|---|---|---|---|
| Video file | Required (1st arg) | — | Path to the local video file (mp4, mkv, avi, etc.) |
| Title | 2nd arg | Filename basename | Video title on YouTube |
| Description | 3rd arg | Empty string | Video description |
| Privacy | 4th arg | `private` | `private`, `unlisted`, or `public` |

**Examples:**

```bash
# Upload as private (default)
node upload.js "my-video.mp4"

# Upload with title, as private
node upload.js "my-video.mp4" "My Awesome Video"

# Upload with title + description, as private
node upload.js "my-video.mp4" "My Awesome Video" "This is a test upload"

# Upload with full parameters, as unlisted
node upload.js "my-video.mp4" "My Video" "Description here" unlisted

# Upload as public
node upload.js "my-video.mp4" "My Video" "Description" public
```

### Setting Private Status

The privacy status is controlled by `requestBody.status.privacyStatus` in the `youtube.videos.insert()` call. The script defaults to `"private"`.

The three possible values:

| Status | Who can see it |
|---|---|
| `private` | Only the uploader and explicitly invited users |
| `unlisted` | Anyone with the link (not listed on the channel or in search) |
| `public` | Everyone — listed on the channel and in search results |

**Why default to private?**

- Safe default — you can review the video on YouTube Studio before making it public.
- Prevents accidental public releases of draft or test content.
- `notifySubscribers: false` ensures subscribers aren't alerted even if you later change the status.

The privacy status can also be changed later via the YouTube Studio UI or the YouTube Data API (`videos.update`).

---

## Quick Reference

### Download (Extract URLs)

```bash
# Start the server
node server.js

# Public video
curl "http://localhost:3001/api/video?url=https://www.youtube.com/watch?v=VIDEO_ID"

# Private video (requires cookies.txt in project root)
curl "http://localhost:3001/api/video?url=https://www.youtube.com/watch?v=VIDEO_ID"

# Using browser cookies instead
BROWSER_COOKIES=chrome node server.js
```

### Upload to YouTube

```bash
# First time (opens browser for OAuth consent)
node upload.js video.mp4 "Title" "Description" private

# Subsequent times (uses saved token.json — no browser needed)
node upload.js video.mp4 "Title" "Description" private
```

### Dependencies to Install

```bash
# Node.js packages
npm install

# yt-dlp (Windows, via winget)
winget install yt-dlp

# Deno (Windows, via PowerShell)
irm https://deno.land/install.ps1 | iex

# Update yt-dlp (important — YouTube changes things frequently)
yt-dlp -U
```

### File Checklist

| File | Required For | How to Get |
|---|---|---|
| `cookies.txt` | Private video download | Browser cookie export extension |
| `client_secret.json` | YouTube upload | Google Cloud Console → Credentials |
| `token.json` | YouTube upload | Auto-generated on first OAuth flow |
