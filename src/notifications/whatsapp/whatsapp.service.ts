import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import NodeCache from 'node-cache';
import P from 'pino';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import type { AnyMessageContent, WASocket as WASocketType } from 'baileys';
import { PrismaService } from '../../prisma/prisma.service';
import { useRedisAuthState } from './whatsapp-auth.state';
import { WhatsAppSendQueue } from './whatsapp-send-queue';
import type {
  ActiveSocket,
  ConnectionResponse,
  ConnectionStatus,
} from './whatsapp.types';

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly sockets = new Map<string, ActiveSocket>();
  private readonly qrCache = new Map<
    string,
    { qr: string; qrDataUrl: string }
  >();
  private readonly groupCache = new NodeCache({
    stdTTL: 5 * 60,
    useClones: false,
  });
  private readonly reconnectAttempts = new Map<string, number>();
  private baileysReady = false;

  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly sendQueue: WhatsAppSendQueue,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initBaileys();
    await this.rehydrateSockets();
  }

  onModuleDestroy() {
    for (const [, active] of this.sockets) {
      try {
        void active.sock.ws?.close();
      } catch {
        // ignore
      }
    }
    this.sockets.clear();
    this.qrCache.clear();
    this.groupCache.close();
  }

  private async initBaileys() {
    try {
      await import('baileys');
      this.baileysReady = true;
    } catch (error) {
      this.logger.error('Failed to import baileys', error);
    }
  }

  private async rehydrateSockets() {
    const sessions = await this.prisma.whatsAppSession.findMany({
      where: { status: 'CONNECTED' },
    });
    for (const session of sessions) {
      this.connectSocket(session.instanceId).catch((err: Error) => {
        this.logger.warn(
          `Reconnect failed for ${session.instanceId}: ${err.message}`,
        );
      });
    }
    this.logger.log(`Rehydrating ${sessions.length} WhatsApp sessions`);
  }

  async connectSocket(
    instanceId: string,
    phoneNumber?: string,
  ): Promise<ConnectionResponse> {
    const { default: makeWASocket, Browsers } = await import('baileys');

    const existing = this.sockets.get(instanceId);
    if (existing) {
      try {
        void existing.sock.ws?.close();
      } catch {
        // ignore
      }
      this.sockets.delete(instanceId);
    }

    const authResult = await useRedisAuthState(
      this.redis,
      instanceId,
      P({ level: 'silent' }),
    );
    const log = P({ level: 'silent' });

    const sock = makeWASocket({
      auth: authResult.state,
      logger: log,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Basma'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      cachedGroupMetadata: async (jid: string) => this.groupCache.get(jid),
      getMessage: () => Promise.resolve(undefined),
    });

    sock.ev.on('creds.update', () => {
      void authResult.saveCreds();
    });

    sock.ev.on('connection.update', (update) => {
      void this.handleConnectionUpdate(
        update,
        instanceId,
        phoneNumber,
        sock,
        authResult,
      );
    });

    sock.ev.on('groups.update', ([ev]: [{ id?: string }]) => {
      const groupId = ev?.id;
      if (groupId) {
        void (async () => {
          try {
            this.groupCache.set(groupId, await sock.groupMetadata(groupId));
          } catch {
            // ignore
          }
        })();
      }
    });

    sock.ev.on('group-participants.update', (ev: { id?: string }) => {
      const groupId = ev?.id;
      if (groupId) {
        void (async () => {
          try {
            this.groupCache.set(groupId, await sock.groupMetadata(groupId));
          } catch {
            // ignore
          }
        })();
      }
    });

    if (!authResult.state.creds.registered) {
      if (phoneNumber) {
        await this.prisma.whatsAppSession.upsert({
          where: { instanceId },
          create: { instanceId, status: 'PAIRING_PENDING' },
          update: { status: 'PAIRING_PENDING' },
        });
        const code = await sock.requestPairingCode(phoneNumber);
        return { method: 'pairing', pairingCode: code };
      }

      const qrResult = await this.waitForQRCode(sock, 15000);
      if (qrResult) {
        return {
          method: 'qr' as const,
          qr: qrResult.qr,
          qrDataUrl: qrResult.qrDataUrl,
        };
      }
      return { method: 'qr' as const, qr: '', qrDataUrl: '' };
    }

    return {
      status: 'reconnecting',
      message: 'Restoring existing WhatsApp session',
    };
  }

  private waitForQRCode(
    sock: WASocketType,
    timeoutMs: number,
  ): Promise<{ qr: string; qrDataUrl: string } | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        sock.ev.off('connection.update', handler);
        resolve(null);
      }, timeoutMs);

      const handler = (update: { qr?: string }) => {
        if (update.qr) {
          clearTimeout(timer);
          sock.ev.off('connection.update', handler);
          QRCode.toDataURL(update.qr)
            .then((qrDataUrl) => resolve({ qr: update.qr!, qrDataUrl }))
            .catch(() => resolve(null));
        }
      };
      sock.ev.on('connection.update', handler);
    });
  }

  private async handleConnectionUpdate(
    update: {
      connection?: string;
      lastDisconnect?: { error?: unknown };
      qr?: string;
    },
    instanceId: string,
    phoneNumber: string | undefined,
    sock: WASocketType,
    authResult: { clearAll: () => Promise<void> },
  ) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr);
      this.qrCache.set(instanceId, { qr, qrDataUrl });
      await this.prisma.whatsAppSession.upsert({
        where: { instanceId },
        create: { instanceId, status: 'QR_PENDING' },
        update: { status: 'QR_PENDING' },
      });
      this.eventEmitter.emit(`whatsapp.qr.${instanceId}`, { qr, qrDataUrl });
    }

    if (connection === 'open') {
      this.logger.log(`WhatsApp connected for instance ${instanceId}`);
      this.qrCache.delete(instanceId);
      this.reconnectAttempts.delete(instanceId);

      const active: ActiveSocket = {
        sock,
        instanceId,
        phoneNumber,
        connectedAt: new Date(),
      };
      this.sockets.set(instanceId, active);

      await this.prisma.whatsAppSession.upsert({
        where: { instanceId },
        create: {
          instanceId,
          phoneNumber,
          status: 'CONNECTED',
          lastConnectedAt: new Date(),
        },
        update: {
          status: 'CONNECTED',
          phoneNumber,
          lastConnectedAt: new Date(),
          lastError: null,
        },
      });
      this.eventEmitter.emit(`whatsapp.status.${instanceId}`, {
        status: 'CONNECTED',
      });
    }

    if (connection === 'close') {
      const boom = lastDisconnect?.error as Boom | undefined;
      const code = boom?.output?.statusCode;
      this.logger.warn(
        `WhatsApp disconnected for ${instanceId}, code: ${code}`,
      );

      this.sockets.delete(instanceId);

      if (code === 401) {
        this.logger.warn(`WhatsApp logged out for instance ${instanceId}`);
        await authResult.clearAll();
        await this.prisma.whatsAppSession.upsert({
          where: { instanceId },
          create: { instanceId, status: 'LOGGED_OUT', lastError: 'logged_out' },
          update: { status: 'LOGGED_OUT', lastError: 'logged_out' },
        });
        this.eventEmitter.emit(`whatsapp.status.${instanceId}`, {
          status: 'LOGGED_OUT',
        });
      } else if (code === 403) {
        await this.prisma.whatsAppSession.upsert({
          where: { instanceId },
          create: { instanceId, status: 'BANNED', lastError: 'banned' },
          update: { status: 'BANNED', lastError: 'banned' },
        });
        this.eventEmitter.emit(`whatsapp.status.${instanceId}`, {
          status: 'BANNED',
        });
      } else {
        const attempts = this.reconnectAttempts.get(instanceId) ?? 0;
        const maxAttempts = this.configService.get<number>(
          'WA_MAX_RECONNECT_ATTEMPTS',
          10,
        );
        if (attempts < maxAttempts) {
          this.reconnectAttempts.set(instanceId, attempts + 1);
          const baseDelay = this.configService.get<number>(
            'WA_RECONNECT_BASE_DELAY',
            1000,
          );
          const delay =
            code === 515 ? 1000 : Math.min(30000, baseDelay * 2 ** attempts);

          await this.prisma.whatsAppSession.upsert({
            where: { instanceId },
            create: {
              instanceId,
              status: 'CONNECTING',
              lastError: `reconnecting (${attempts + 1})`,
            },
            update: {
              status: 'CONNECTING',
              lastError: `reconnecting (${attempts + 1})`,
            },
          });

          setTimeout(() => {
            void this.connectSocket(instanceId, phoneNumber);
          }, delay);
        } else {
          await this.prisma.whatsAppSession.upsert({
            where: { instanceId },
            create: {
              instanceId,
              status: 'DISCONNECTED',
              lastError: 'max_reconnect_attempts',
            },
            update: {
              status: 'DISCONNECTED',
              lastError: 'max_reconnect_attempts',
            },
          });
        }
      }
    }
  }

  async disconnect(instanceId: string) {
    const active = this.sockets.get(instanceId);
    if (active) {
      try {
        void active.sock.ws?.close();
      } catch {
        // ignore
      }
      this.sockets.delete(instanceId);
    }
    this.qrCache.delete(instanceId);
    this.reconnectAttempts.delete(instanceId);

    const authResult = await useRedisAuthState(this.redis, instanceId);
    await authResult.clearAll();

    await this.prisma.whatsAppSession.upsert({
      where: { instanceId },
      create: { instanceId, status: 'DISCONNECTED' },
      update: { status: 'DISCONNECTED' },
    });
  }

  getStatus(instanceId: string): ConnectionStatus {
    const active = this.sockets.get(instanceId);
    if (active) {
      return {
        status: 'CONNECTED',
        phoneNumber: active.phoneNumber,
        lastConnectedAt: active.connectedAt.toISOString(),
      };
    }
    return { status: 'DISCONNECTED' };
  }

  getCurrentQR(instanceId: string): string | null {
    return this.qrCache.get(instanceId)?.qrDataUrl ?? null;
  }

  async sendMessage(
    instanceId: string,
    jid: string,
    content: AnyMessageContent,
    options?: Record<string, unknown>,
  ) {
    const active = this.sockets.get(instanceId);
    if (!active) {
      throw new Error('WhatsApp not connected');
    }
    return this.sendQueue.enqueue(
      instanceId,
      active.sock,
      jid,
      content,
      options,
    );
  }

  isConnected(instanceId: string): boolean {
    return this.sockets.has(instanceId);
  }

  getSocket(instanceId: string): WASocketType | null {
    return this.sockets.get(instanceId)?.sock ?? null;
  }
}
