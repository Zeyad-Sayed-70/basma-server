import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'node:crypto';
import { google } from 'googleapis';

const ALGORITHM = 'aes-256-gcm';
const ENCODING: BufferEncoding = 'hex';

function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let enc = cipher.update(text, 'utf8', ENCODING);
  enc += cipher.final(ENCODING);
  const authTag = cipher.getAuthTag().toString(ENCODING);
  return `${iv.toString(ENCODING)}:${authTag}:${enc}`;
}

function decrypt(encoded: string, key: Buffer): string {
  const [ivHex, authTagHex, enc] = encoded.split(':');
  const iv = Buffer.from(ivHex, ENCODING);
  const authTag = Buffer.from(authTagHex, ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let dec = decipher.update(enc, ENCODING, 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const keyStr = this.config.getOrThrow<string>('YT_ENCRYPTION_KEY');
    this.encryptionKey = crypto.createHash('sha256').update(keyStr).digest();
  }

  async getAuth() {
    const row = await this.prisma.youtubeChannelAuth.findUnique({
      where: { id: 'singleton' },
    });
    if (!row) return null;

    const clientId = decrypt(row.clientId, this.encryptionKey);
    const clientSecret = decrypt(row.clientSecret, this.encryptionKey);
    const refreshToken = decrypt(row.refreshToken, this.encryptionKey);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'urn:ietf:wg:oauth:2.0:oob',
    );
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: row.accessToken ?? undefined,
      expiry_date: row.expiresAt
        ? new Date(row.expiresAt).getTime()
        : undefined,
    });

    oauth2Client.on(
      'tokens',

      async (tokens: Record<string, any>) => {
        const update: Record<string, unknown> = {};
        if (tokens.access_token) {
          update.accessToken = String(tokens.access_token);
        }
        if (tokens.expiry_date) {
          update.expiresAt = new Date(Number(tokens.expiry_date));
        }
        if (tokens.refresh_token) {
          update.refreshToken = encrypt(
            String(tokens.refresh_token),
            this.encryptionKey,
          );
        }
        if (Object.keys(update).length > 0) {
          await this.prisma.youtubeChannelAuth.update({
            where: { id: 'singleton' },
            data: update as never,
          });
          this.logger.log('oauth.tokens_refreshed');
        }
      },
    );

    return { oauth2Client, row };
  }

  async getChannelInfo(): Promise<{
    channelId: string | null;
    channelTitle: string | null;
  } | null> {
    const auth = await this.getAuth();
    if (!auth) return null;

    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: auth.oauth2Client,
      });
      const res = await youtube.channels.list({
        part: ['snippet'],
        mine: true,
      });
      const channel = res.data.items?.[0];
      return {
        channelId: channel?.id ?? null,
        channelTitle: channel?.snippet?.title ?? null,
      };
    } catch (err) {
      this.logger.warn(`channel.info_failed ${(err as Error).message}`);
      return null;
    }
  }

  async saveTokens(code: string) {
    const clientId = this.config.getOrThrow<string>('YT_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('YT_CLIENT_SECRET');
    const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    let tokens;
    try {
      const res = await oauth2Client.getToken(code);
      tokens = res.tokens;
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(
        `oauth.token_exchange_failed: ${msg}` +
          ` | clientId=${clientId.slice(0, 8)}...` +
          ` | redirectUri=${redirectUri}` +
          ` | Ensure "${redirectUri}" is added to Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs` +
          ` | Also check that the code hasn't expired (valid ~5 min) or been used already.`,
      );
      throw err;
    }
    const expiryMs = tokens.expiry_date
      ? new Date(Number(tokens.expiry_date))
      : null;
    const enc = (v: string) => encrypt(v, this.encryptionKey);

    await this.prisma.youtubeChannelAuth.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        clientId: enc(clientId),
        clientSecret: enc(clientSecret),
        refreshToken: enc(tokens.refresh_token!),
        accessToken: tokens.access_token ?? null,
        scope: tokens.scope ?? '',
        expiresAt: expiryMs,
      },
      update: {
        clientId: enc(clientId),
        clientSecret: enc(clientSecret),
        refreshToken: enc(tokens.refresh_token!),
        accessToken: tokens.access_token ?? null,
        scope: tokens.scope ?? '',
        expiresAt: expiryMs,
      },
    });

    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const res = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });
    const channel = res.data.items?.[0];

    if (channel) {
      await this.prisma.youtubeChannelAuth.update({
        where: { id: 'singleton' },
        data: {
          channelId: channel.id,
          channelTitle: channel.snippet?.title,
        },
      });
    }
  }

  getAuthUrl(): string {
    const clientId = this.config.getOrThrow<string>('YT_CLIENT_ID');
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      '',
      'urn:ietf:wg:oauth:2.0:oob',
    );
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.upload',
      ],
    });
  }

  async createYoutubeClient() {
    const auth = await this.getAuth();
    if (!auth) throw new Error('YouTube channel not connected');
    const youtube = google.youtube({
      version: 'v3',
      auth: auth.oauth2Client,
    });
    return { youtube, oauth2Client: auth.oauth2Client };
  }
}
