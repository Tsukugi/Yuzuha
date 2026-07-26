import {emptyAppData, type AppData} from '../types/domain';
import {
  SqliteWorkspaceStore,
  type SqliteExecutor,
  type SqliteResult,
  type WorkspaceStore,
} from './sqliteStore';

class MemorySqlite implements SqliteExecutor {
  schemaVersion: string | null = null;
  meta = new Map<string, string>();
  records = new Map<string, {recordType: string; recordId: string; payloadJson: string; updatedAt: string}>();

  async execute(query: string, params: Array<string | number | boolean | null> = []): Promise<SqliteResult> {
    const normalized = query.replace(/\s+/g, ' ').trim();
    if (normalized.startsWith('CREATE TABLE') || normalized.startsWith('CREATE INDEX')) {
      return {rows: [], rowsAffected: 0};
    }
    if (normalized === 'SELECT value FROM repository_meta WHERE key = ?') {
      const value = this.meta.get(String(params[0]));
      return {rows: value === undefined ? [] : [{value}], rowsAffected: 0};
    }
    if (normalized === 'SELECT schema_version FROM repository_meta WHERE key = ?') {
      return {rows: this.schemaVersion ? [{schema_version: this.schemaVersion}] : [], rowsAffected: 0};
    }
    if (normalized === 'SELECT record_type, record_id, payload_json, updated_at FROM app_records ORDER BY record_type, record_id') {
      return {
        rows: [...this.records.values()].map(record => ({
          record_type: record.recordType,
          record_id: record.recordId,
          payload_json: record.payloadJson,
          updated_at: record.updatedAt,
        })),
        rowsAffected: 0,
      };
    }
    if (normalized === 'DELETE FROM app_records') {
      this.records.clear();
      return {rows: [], rowsAffected: 0};
    }
    if (normalized === 'DELETE FROM repository_meta') {
      this.meta.clear();
      this.schemaVersion = null;
      return {rows: [], rowsAffected: 0};
    }
    if (normalized === 'INSERT INTO repository_meta (key, value) VALUES (?, ?)') {
      const key = String(params[0]);
      const value = String(params[1]);
      this.meta.set(key, value);
      if (key === 'schema_version') {
        this.schemaVersion = value;
      }
      return {rows: [], rowsAffected: 1};
    }
    if (normalized === 'INSERT INTO app_records (record_type, record_id, payload_json, updated_at) VALUES (?, ?, ?, ?)') {
      const [recordType, recordId, payloadJson, updatedAt] = params.map(String);
      this.records.set(`${recordType}:${recordId}`, {recordType, recordId, payloadJson, updatedAt});
      return {rows: [], rowsAffected: 1};
    }
    throw new Error(`Unexpected query in test database: ${normalized}`);
  }

  async transaction(callback: (tx: SqliteExecutor) => Promise<void>): Promise<void> {
    await callback(this);
  }
}

function legacyStore(data: AppData): WorkspaceStore {
  return {
    load: async () => data,
    save: async () => undefined,
  };
}

describe('SQLite workspace store', () => {
  it('imports legacy data on first load and preserves it in SQLite records', async () => {
    const legacy = emptyAppData();
    legacy.money.push({
      id: 'money_legacy',
      kind: 'expense',
      amountMinor: 1250,
      currency: 'EUR',
      accountId: 'account_everyday',
      categoryId: 'category_food',
      category: 'Food',
      note: 'Lunch',
      occurredAt: '2026-07-26T12:00:00.000Z',
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    legacy.usageExcludedPackages = ['com.example.excluded'];
    const database = new MemorySqlite();
    const store = new SqliteWorkspaceStore(database, legacyStore(legacy));

    await expect(store.load()).resolves.toEqual(legacy);
    expect(database.schemaVersion).toBe('1');
    expect(database.records.has('money:money_legacy')).toBe(true);
    expect(database.records.has('usage_exclusion:com.example.excluded')).toBe(true);
  });

  it('round-trips all Phase 3 collections through one transaction', async () => {
    const data = emptyAppData();
    data.mainCurrency = 'USD';
    data.accounts = [
      {...data.accounts[0], currency: 'USD'},
      {
        id: 'account_savings',
        name: 'Savings',
        currency: 'USD',
        openingBalanceMinor: 0,
        isArchived: false,
      },
    ];
    data.transfers.push({
      id: 'transfer_1',
      fromAccountId: 'account_everyday',
      toAccountId: 'account_savings',
      amountMinor: 500,
      currency: 'USD',
      note: 'Move money',
      occurredAt: '2026-07-26T12:00:00.000Z',
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.money.push({
      id: 'money_split_parent',
      kind: 'expense',
      amountMinor: 1000,
      currency: 'USD',
      accountId: 'account_everyday',
      categoryId: null,
      category: 'Split',
      note: 'Trip',
      occurredAt: '2026-07-26T12:00:00.000Z',
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
      splitId: 'split_1',
    });
    data.splits.push({
      id: 'split_1',
      parentEntryId: 'money_split_parent',
      lines: [
        {id: 'split_line_1', categoryId: 'category_food', category: 'Food', amountMinor: 700, note: ''},
        {id: 'split_line_2', categoryId: 'category_transport', category: 'Transport', amountMinor: 300, note: ''},
      ],
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.budgets.push({
      id: 'budget_food',
      categoryId: 'category_food',
      category: 'Food',
      amountMinor: 2000,
      currency: 'USD',
      period: 'month',
      isArchived: false,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.notes.push({
      id: 'note_1',
      title: 'A note',
      body: 'Body',
      isPinned: false,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.timeGoals.push({id: 'goal_1', name: 'Focus', period: 'week', targetSeconds: 3600, isArchived: false});
    const database = new MemorySqlite();
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    await store.save(data);

    await expect(store.load()).resolves.toEqual(data);
  });

  it('rejects unsupported repository versions instead of guessing', async () => {
    const database = new MemorySqlite();
    database.schemaVersion = '2';
    database.meta.set('schema_version', '2');
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    await expect(store.load()).rejects.toThrow('Unsupported Yuzuha SQLite schema version 2.');
  });

  it('rejects malformed persisted record payloads', async () => {
    const database = new MemorySqlite();
    database.schemaVersion = '1';
    database.meta.set('schema_version', '1');
    database.records.set('money:broken', {
      recordType: 'money',
      recordId: 'broken',
      payloadJson: '{not-json',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    await expect(store.load()).rejects.toThrow('Yuzuha SQLite data is corrupt.');
  });
});
