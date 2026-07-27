import AsyncStorage from '@react-native-async-storage/async-storage';
import {migrateStoredData} from './migrations';
import {emptyAppData} from '../types/domain';
import type {AppData} from '../types/domain';

const STORAGE_KEY = '@yuzuha/app-data/v17';
const LEGACY_SCHEMA_KEYS = ['@yuzuha/app-data/v16', '@yuzuha/app-data/v15', '@yuzuha/app-data/v14', '@yuzuha/app-data/v13', '@yuzuha/app-data/v12', '@yuzuha/app-data/v11', '@yuzuha/app-data/v10', '@yuzuha/app-data/v9', '@yuzuha/app-data/v8', '@yuzuha/app-data/v7', '@yuzuha/app-data/v6', '@yuzuha/app-data/v5', '@yuzuha/app-data/v4', '@yuzuha/app-data/v3', '@yuzuha/app-data/v2', '@yuzuha/app-data/v1'];

export interface StorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export class StorageCorruptError extends Error {
  constructor() {
    super('Yuzuha local data is not valid JSON or a supported schema.');
    this.name = 'StorageCorruptError';
  }
}

export class LocalStore {
  constructor(private readonly driver: StorageDriver = AsyncStorage) {}

  async load(): Promise<AppData> {
    const currentRaw = await this.driver.getItem(STORAGE_KEY);
    let raw = currentRaw;
    for (const key of LEGACY_SCHEMA_KEYS) {
      if (raw !== null) {
        break;
      }
      raw = await this.driver.getItem(key);
    }
    if (raw === null) {
      return emptyAppData();
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      const migrated = migrateStoredData(parsed);
      if (!migrated) {
        throw new StorageCorruptError();
      }
      if (migrated !== parsed) {
        await this.save(migrated);
      }
      return migrated;
    } catch (error) {
      if (error instanceof StorageCorruptError) {
        throw error;
      }
      throw new StorageCorruptError();
    }
  }

  async save(data: AppData): Promise<void> {
    await this.driver.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
