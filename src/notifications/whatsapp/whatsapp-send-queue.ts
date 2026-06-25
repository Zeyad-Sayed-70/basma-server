import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WASocket, AnyMessageContent } from 'baileys';

interface QueueItem {
  jid: string;
  content: AnyMessageContent;
  options?: Record<string, unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

@Injectable()
export class WhatsAppSendQueue {
  private readonly logger = new Logger(WhatsAppSendQueue.name);
  private readonly queues = new Map<string, QueueItem[]>();
  private readonly processing = new Set<string>();
  private readonly minDelay: number;
  private readonly inFlight = new Map<string, number>();

  constructor(configService: ConfigService) {
    const rateLimit = configService.get<number>('WA_MESSAGE_RATE_LIMIT', 12);
    this.minDelay = Math.ceil(60000 / rateLimit);
  }

  enqueue(
    instanceId: string,
    sock: WASocket,
    jid: string,
    content: AnyMessageContent,
    options?: Record<string, unknown>,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.queues.has(instanceId)) {
        this.queues.set(instanceId, []);
      }
      const queue = this.queues.get(instanceId)!;
      queue.push({ jid, content, options, resolve, reject });
      void this.processQueue(instanceId, sock);
    });
  }

  private async processQueue(instanceId: string, sock: WASocket) {
    if (this.processing.has(instanceId)) return;
    this.processing.add(instanceId);

    try {
      const queue = this.queues.get(instanceId);
      if (!queue || queue.length === 0) {
        return;
      }

      const now = Date.now();
      const lastSent = this.inFlight.get(instanceId) ?? 0;
      const waitTime = Math.max(0, this.minDelay - (now - lastSent));

      if (waitTime > 0) {
        await new Promise((r) => setTimeout(r, waitTime));
      }

      const item = queue.shift()!;
      try {
        await this.sendWithHumanTyping(
          sock,
          item.jid,
          item.content,
          item.options,
        );
        item.resolve(undefined);
      } catch (error) {
        item.reject(error as Error);
      }

      this.inFlight.set(instanceId, Date.now());

      if (this.queues.get(instanceId)?.length) {
        setImmediate(() => {
          void this.processQueue(instanceId, sock);
        });
      }
    } finally {
      this.processing.delete(instanceId);
    }
  }

  private async sendWithHumanTyping(
    sock: WASocket,
    jid: string,
    content: AnyMessageContent,
    options?: Record<string, unknown>,
  ) {
    const text =
      'text' in content && typeof content.text === 'string' ? content.text : '';
    const typingDuration = Math.min(4000, Math.max(800, text.length * 40));
    const jitter = Math.random() * 600;

    try {
      await sock.sendPresenceUpdate('composing', jid);
    } catch {
      // presence may not be available
    }

    await new Promise((r) => setTimeout(r, typingDuration + jitter));

    try {
      await sock.sendPresenceUpdate('paused', jid);
    } catch {
      // presence may not be available
    }

    await sock.sendMessage(jid, content, options);
  }
}
