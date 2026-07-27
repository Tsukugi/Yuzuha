import {LocalStore, StorageCorruptError, type StorageDriver} from './localStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

class MemoryStorage implements StorageDriver {
  private values = new Map<string, string>();

  getItem(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }
}

describe('LocalStore', () => {
  it('returns an empty schema on first use and persists data', async () => {
    const driver = new MemoryStorage();
    const store = new LocalStore(driver);
    const data = await store.load();
    data.notes.push({
      id: 'note-1',
      title: 'First note',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    await store.save(data);
    await expect(store.load()).resolves.toEqual(data);
  });

  it('rejects invalid stored data instead of silently replacing it', async () => {
    const driver = new MemoryStorage();
    await driver.setItem('@yuzuha/app-data/v1', '{"wrong":true}');
    await expect(new LocalStore(driver).load()).rejects.toBeInstanceOf(StorageCorruptError);
  });

  it('migrates the previous schema without dropping records', async () => {
    const driver = new MemoryStorage();
    await driver.setItem(
      '@yuzuha/app-data/v1',
      JSON.stringify({
        schemaVersion: 1,
        money: [
          {
            id: 'money-1',
            kind: 'expense',
            amountMinor: 1250,
            currency: 'EUR',
            category: 'Lunch',
            note: '',
            occurredAt: '2026-07-26T00:00:00.000Z',
            createdAt: '2026-07-26T00:00:00.000Z',
            updatedAt: '2026-07-26T00:00:00.000Z',
          },
        ],
        notes: [],
        tasks: [],
      }),
    );

    const data = await new LocalStore(driver).load();
    expect(data.schemaVersion).toBe(14);
    expect(data.money[0].accountId).toBe('account_everyday');
    expect(data.money[0].categoryId).toBe('category_lunch');
    await expect(driver.getItem('@yuzuha/app-data/v14')).resolves.toContain('schemaVersion');
  });
});
