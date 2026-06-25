import { AsyncLocalStorage } from 'async_hooks';

export interface TenantData {
  instanceId: string;
  teacherId?: string;
  role?: string;
}

export class TenantContext {
  private static storage = new AsyncLocalStorage<TenantData>();

  static run(data: TenantData, callback: () => void) {
    this.storage.run(data, callback);
  }

  static get(): TenantData | undefined {
    return this.storage.getStore();
  }

  static getInstanceId(): string | undefined {
    return this.storage.getStore()?.instanceId;
  }

  static async runWithContext<T>(
    data: TenantData,
    callback: () => Promise<T>,
  ): Promise<T> {
    return this.storage.run(data, callback);
  }
}
