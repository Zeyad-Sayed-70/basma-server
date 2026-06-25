import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS',
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const db = configService.get<number>('REDIS_DB', 0);

        const client = new Redis({
          host,
          port,
          db,
          lazyConnect: true,
          retryStrategy: (times) => {
            if (times > 10) return null;
            return Math.min(times * 200, 3000);
          },
        });

        client.on('error', (err) => {
          logger.warn(`Redis connection error: ${err.message}`);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS'],
})
export class RedisModule {}
