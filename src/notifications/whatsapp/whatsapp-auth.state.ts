import Redis from 'ioredis';
import type {
  AuthenticationState,
  AuthenticationCreds,
  SignalDataTypeMap,
  SignalKeyStore,
} from 'baileys';
import type { Logger } from 'pino';

const KEY_PREFIX = 'baileys';

export interface RedisAuthStateResult {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearAll: () => Promise<void>;
}

function buildKey(instanceId: string, suffix: string): string {
  return `${KEY_PREFIX}:${instanceId}:${suffix}`;
}

export async function useRedisAuthState(
  redis: Redis,
  instanceId: string,
  logger?: Logger,
): Promise<RedisAuthStateResult> {
  const { initAuthCreds, BufferJSON, makeCacheableSignalKeyStore } =
    await import('baileys');

  const readData = async (key: string) => {
    const raw = await redis.get(buildKey(instanceId, key));
    return raw ? (JSON.parse(raw, BufferJSON.reviver) as unknown) : null;
  };

  const writeData = async (data: unknown, key: string) => {
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    await redis.set(buildKey(instanceId, key), serialized);
  };

  const removeData = async (key: string) => {
    await redis.del(buildKey(instanceId, key));
  };

  const credsData = await readData('creds');
  let creds: AuthenticationCreds =
    (credsData as AuthenticationCreds) || initAuthCreds();

  const keys: SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const data: { [id: string]: SignalDataTypeMap[T] } = {};
      await Promise.all(
        ids.map(async (id) => {
          const value = await readData(`${type as string}-${id}`);
          if (value) {
            data[id] = value as SignalDataTypeMap[T];
          }
        }),
      );
      return data;
    },
    set: async (data: Record<string, Record<string, unknown>>) => {
      const tasks: Promise<void>[] = [];
      for (const category in data) {
        for (const id in data[category]) {
          const value = data[category][id];
          if (value) {
            tasks.push(writeData(value, `${category}-${id}`));
          } else {
            tasks.push(removeData(`${category}-${id}`));
          }
        }
      }
      await Promise.all(tasks);
    },
  };

  const saveCreds = async () => {
    await writeData(creds, 'creds');
  };

  const clearAll = async () => {
    const keyPattern = `${KEY_PREFIX}:${instanceId}:*`;
    const foundKeys = await redis.keys(keyPattern);
    if (foundKeys.length > 0) {
      await redis.del(...foundKeys);
    }
    creds = initAuthCreds();
  };

  return {
    state: {
      creds,
      keys: makeCacheableSignalKeyStore(keys, logger),
    },
    saveCreds,
    clearAll,
  };
}
