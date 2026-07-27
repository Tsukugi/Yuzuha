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
  moneyEntries = new Map<string, Array<string | number | null>>();
  transfers = new Map<string, Array<string | number>>();
  splits = new Map<string, Array<string>>();
  splitLines = new Map<string, Array<string | number>>();
  budgets = new Map<string, Array<string | number>>();

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
    if (normalized === 'SELECT id, kind, amount_minor, currency, account_id, category_id, category, note, occurred_at, created_at, updated_at, split_id FROM money_entries ORDER BY occurred_at, id') {
      return {
        rows: [...this.moneyEntries.values()].map(values => ({
          id: values[0], kind: values[1], amount_minor: values[2], currency: values[3], account_id: values[4],
          category_id: values[5], category: values[6], note: values[7], occurred_at: values[8], created_at: values[9],
          updated_at: values[10], split_id: values[11],
        })),
        rowsAffected: 0,
      };
    }
    if (normalized === 'SELECT id, from_account_id, to_account_id, amount_minor, currency, note, occurred_at, created_at, updated_at FROM money_transfers ORDER BY occurred_at, id') {
      return {
        rows: [...this.transfers.values()].map(values => ({
          id: values[0], from_account_id: values[1], to_account_id: values[2], amount_minor: values[3], currency: values[4],
          note: values[5], occurred_at: values[6], created_at: values[7], updated_at: values[8],
        })),
        rowsAffected: 0,
      };
    }
    if (normalized === 'SELECT id, split_id, category_id, category, amount_minor, note FROM money_split_lines ORDER BY split_id, id') {
      return {
        rows: [...this.splitLines.values()].map(values => ({
          id: values[0], split_id: values[1], category_id: values[2], category: values[3], amount_minor: values[4], note: values[5],
        })),
        rowsAffected: 0,
      };
    }
    if (normalized === 'SELECT id, parent_entry_id, created_at, updated_at FROM money_splits ORDER BY id') {
      return {
        rows: [...this.splits.values()].map(values => ({id: values[0], parent_entry_id: values[1], created_at: values[2], updated_at: values[3]})),
        rowsAffected: 0,
      };
    }
    if (normalized === 'SELECT id, category_id, category, amount_minor, currency, period, rollover, is_archived, created_at, updated_at FROM money_budgets ORDER BY id') {
      return {
        rows: [...this.budgets.values()].map(values => ({
          id: values[0], category_id: values[1], category: values[2], amount_minor: values[3], currency: values[4], period: values[5],
          rollover: values[6], is_archived: values[7], created_at: values[8], updated_at: values[9],
        })),
        rowsAffected: 0,
      };
    }
    if (normalized === 'DELETE FROM app_records') {
      this.records.clear();
      return {rows: [], rowsAffected: 0};
    }
    if (normalized === 'DELETE FROM money_split_lines') {
      this.splitLines.clear();
      return {rows: [], rowsAffected: 0};
    }
    if (normalized === 'DELETE FROM money_splits') {
      this.splits.clear();
      return {rows: [], rowsAffected: 0};
    }
    if (normalized === 'DELETE FROM money_transfers') {
      this.transfers.clear();
      return {rows: [], rowsAffected: 0};
    }
    if (normalized === 'DELETE FROM money_entries') {
      this.moneyEntries.clear();
      return {rows: [], rowsAffected: 0};
    }
    if (normalized === 'DELETE FROM money_budgets') {
      this.budgets.clear();
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
    if (normalized === 'INSERT INTO money_entries (id, kind, amount_minor, currency, account_id, category_id, category, note, occurred_at, created_at, updated_at, split_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)') {
      this.moneyEntries.set(String(params[0]), params as Array<string | number | null>);
      return {rows: [], rowsAffected: 1};
    }
    if (normalized === 'INSERT INTO money_transfers (id, from_account_id, to_account_id, amount_minor, currency, note, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)') {
      this.transfers.set(String(params[0]), params as Array<string | number>);
      return {rows: [], rowsAffected: 1};
    }
    if (normalized === 'INSERT INTO money_splits (id, parent_entry_id, created_at, updated_at) VALUES (?, ?, ?, ?)') {
      this.splits.set(String(params[0]), params as string[]);
      return {rows: [], rowsAffected: 1};
    }
    if (normalized === 'INSERT INTO money_split_lines (id, split_id, category_id, category, amount_minor, note) VALUES (?, ?, ?, ?, ?, ?)') {
      this.splitLines.set(String(params[0]), params as Array<string | number>);
      return {rows: [], rowsAffected: 1};
    }
    if (normalized === 'INSERT INTO money_budgets (id, category_id, category, amount_minor, currency, period, rollover, is_archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)') {
      this.budgets.set(String(params[0]), params as Array<string | number>);
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
    expect(database.schemaVersion).toBe('2');
    expect(database.moneyEntries.has('money_legacy')).toBe(true);
    expect(database.records.has('money:money_legacy')).toBe(false);
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
      rollover: 'none',
      isArchived: false,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.recurrences.push({
      id: 'recurrence_food',
      kind: 'expense',
      amountMinor: 1250,
      currency: 'USD',
      accountId: 'account_everyday',
      categoryId: 'category_food',
      category: 'Food',
      note: 'Subscription',
      cadence: 'month',
      interval: 1,
      nextOccurrenceLocalDate: '2026-08-01',
      missedOccurrencePolicy: 'all',
      isPaused: false,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.notes.push({
      id: 'note_1',
      title: 'A note',
      body: 'Body',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.attachments.push({
      id: 'attachment_1',
      noteId: 'note_1',
      name: 'reference.txt',
      mimeType: 'text/plain',
      byteSize: 24,
      sha256: 'a'.repeat(64),
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.savedSearches.push({
      id: 'saved_search_1',
      name: 'Work notes',
      query: 'work',
      showArchived: false,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.taskLists.push({
      id: 'task_list_work',
      name: 'Work',
      isArchived: false,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.taskRecurrences.push({
      id: 'task_recurrence_work',
      title: 'Weekly review',
      details: 'Keep it current.',
      priority: 'normal',
      listId: 'task_list_work',
      cadence: 'week',
      interval: 1,
      nextOccurrenceLocalDate: '2026-08-02',
      missedOccurrencePolicy: 'all',
      isPaused: false,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.tasks.push({
      id: 'task_from_note',
      title: 'A note',
      details: 'Body',
      status: 'open',
      dueLocalDate: null,
      priority: 'normal',
      listId: 'task_list_work',
      sourceNoteId: 'note_1',
      recurrenceRuleId: null,
      reminderAtMillis: 1780000000000,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    data.timeGoals.push({id: 'goal_1', name: 'Focus', period: 'week', targetSeconds: 3600, isArchived: false});
    const database = new MemorySqlite();
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    await store.save(data);

    await expect(store.load()).resolves.toEqual(data);
  });

  it('migrates schema 1 financial records into normalized tables', async () => {
    const legacy = emptyAppData();
    legacy.accounts = [];
    legacy.categories = [];
    legacy.money.push({
      id: 'money_old',
      kind: 'expense',
      amountMinor: 900,
      currency: 'EUR',
      accountId: 'account_everyday',
      categoryId: 'category_food',
      category: 'Food',
      note: '',
      occurredAt: '2026-07-26T12:00:00.000Z',
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });
    const database = new MemorySqlite();
    database.schemaVersion = '1';
    database.meta.set('schema_version', '1');
    database.meta.set('main_currency', 'EUR');
    database.meta.set('usage_read', JSON.stringify(legacy.usageRead));
    database.records.set('money:money_old', {
      recordType: 'money',
      recordId: 'money_old',
      payloadJson: JSON.stringify(legacy.money[0]),
      updatedAt: legacy.money[0].updatedAt,
    });
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    await expect(store.load()).resolves.toEqual(legacy);
    expect(database.schemaVersion).toBe('2');
    expect(database.moneyEntries.has('money_old')).toBe(true);
    expect(database.records.has('money:money_old')).toBe(false);
  });

  it('rejects unsupported repository versions instead of guessing', async () => {
    const database = new MemorySqlite();
    database.schemaVersion = '3';
    database.meta.set('schema_version', '3');
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    await expect(store.load()).rejects.toThrow('Unsupported Yuzuha SQLite schema version 3.');
  });

  it('upgrades old SQLite recurrence rows to the explicit all policy', async () => {
    const database = new MemorySqlite();
    database.schemaVersion = '2';
    database.meta.set('schema_version', '2');
    database.meta.set('main_currency', 'EUR');
    database.records.set('recurrence:old_rule', {
      recordType: 'recurrence',
      recordId: 'old_rule',
      payloadJson: JSON.stringify({
        id: 'old_rule',
        kind: 'expense',
        amountMinor: 1000,
        currency: 'EUR',
        accountId: 'account_everyday',
        categoryId: 'category_food',
        category: 'Food',
        note: '',
        cadence: 'month',
        interval: 1,
        nextOccurrenceLocalDate: '2026-07-26',
        isPaused: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      }),
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    const data = await store.load();

    expect(data.recurrences[0].missedOccurrencePolicy).toBe('all');
  });

  it('upgrades old SQLite note rows to an empty tag collection', async () => {
    const database = new MemorySqlite();
    database.schemaVersion = '2';
    database.meta.set('schema_version', '2');
    database.meta.set('main_currency', 'EUR');
    database.records.set('note:old_note', {
      recordType: 'note',
      recordId: 'old_note',
      payloadJson: JSON.stringify({
        id: 'old_note',
        title: 'Old note',
        body: 'Still here',
        isPinned: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      }),
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    const data = await store.load();

    expect(data.notes[0].tags).toEqual([]);
    expect(data.notes[0].isArchived).toBe(false);
  });

  it('upgrades old SQLite task rows with a null source-note link', async () => {
    const database = new MemorySqlite();
    database.schemaVersion = '2';
    database.meta.set('schema_version', '2');
    database.meta.set('main_currency', 'EUR');
    database.records.set('task:old_task', {
      recordType: 'task',
      recordId: 'old_task',
      payloadJson: JSON.stringify({
        id: 'old_task',
        title: 'Old task',
        details: '',
        status: 'open',
        dueLocalDate: null,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      }),
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    const store = new SqliteWorkspaceStore(database, legacyStore(emptyAppData()));

    const data = await store.load();

    expect(data.tasks[0].sourceNoteId).toBeNull();
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
