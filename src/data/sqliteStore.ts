import {emptyAppData} from '../types/domain';
import type {
  AppData,
  MoneyAccount,
  MoneyCategory,
  MoneyEntry,
  MoneySplit,
  MoneyTransfer,
  MoneyBudget,
  Note,
  Task,
  TimeGoal,
  UsageSnapshot,
} from '../types/domain';

export type SqliteScalar = string | number | boolean | null;

export interface SqliteResult {
  rows: Array<Record<string, unknown>>;
  rowsAffected?: number;
}

export interface SqliteExecutor {
  execute(query: string, params?: SqliteScalar[]): Promise<SqliteResult>;
  transaction(callback: (tx: SqliteExecutor) => Promise<void>): Promise<void>;
}

export interface WorkspaceStore {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
}

const REPOSITORY_SCHEMA_VERSION = 1;
const DEFAULT_UPDATED_AT = '1970-01-01T00:00:00.000Z';

const CREATE_META_TABLE = `
  CREATE TABLE IF NOT EXISTS repository_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )
`;

const CREATE_RECORDS_TABLE = `
  CREATE TABLE IF NOT EXISTS app_records (
    record_type TEXT NOT NULL,
    record_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (record_type, record_id)
  )
`;

const CREATE_RECORDS_INDEX = `
  CREATE INDEX IF NOT EXISTS app_records_type_updated_idx
  ON app_records (record_type, updated_at)
`;

export class SqliteSchemaError extends Error {
  constructor(version: string) {
    super(`Unsupported Yuzuha SQLite schema version ${version}.`);
    this.name = 'SqliteSchemaError';
  }
}

export class SqliteDataCorruptError extends Error {
  constructor() {
    super('Yuzuha SQLite data is corrupt.');
    this.name = 'SqliteDataCorruptError';
  }
}

type RecordType =
  | 'money'
  | 'transfer'
  | 'split'
  | 'budget'
  | 'account'
  | 'category'
  | 'note'
  | 'task'
  | 'usage_snapshot'
  | 'time_goal'
  | 'usage_exclusion';

interface PersistedRecord {
  recordType: RecordType;
  recordId: string;
  payloadJson: string;
  updatedAt: string;
}

export class SqliteWorkspaceStore implements WorkspaceStore {
  private initialized: Promise<void> | null = null;

  constructor(
    private readonly database: SqliteExecutor,
    private readonly legacyStore: WorkspaceStore,
  ) {}

  async load(): Promise<AppData> {
    await this.ensureInitialized();
    const meta = await this.database.execute('SELECT value FROM repository_meta WHERE key = ?', ['usage_read']);
    const currency = await this.database.execute('SELECT value FROM repository_meta WHERE key = ?', ['main_currency']);
    const records = await this.database.execute(
      'SELECT record_type, record_id, payload_json, updated_at FROM app_records ORDER BY record_type, record_id',
    );
    return decodeAppData(records.rows, readText(currency.rows[0]?.value) ?? 'EUR', readText(meta.rows[0]?.value));
  }

  async save(data: AppData): Promise<void> {
    await this.ensureInitialized();
    await writeAppData(this.database, data);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.initialized = this.initialize();
    }
    try {
      await this.initialized;
    } catch (error) {
      this.initialized = null;
      throw error;
    }
  }

  private async initialize(): Promise<void> {
    await this.database.execute(CREATE_META_TABLE);
    await this.database.execute(CREATE_RECORDS_TABLE);
    await this.database.execute(CREATE_RECORDS_INDEX);

    const result = await this.database.execute('SELECT value FROM repository_meta WHERE key = ?', ['schema_version']);
    const version = readText(result.rows[0]?.value);
    if (version === null) {
      const legacy = await this.legacyStore.load();
      await writeAppData(this.database, legacy);
      return;
    }
    if (version !== String(REPOSITORY_SCHEMA_VERSION)) {
      throw new SqliteSchemaError(version);
    }
  }
}

export function decodeAppData(
  rows: Array<Record<string, unknown>>,
  mainCurrency: string,
  usageReadJson: string | null,
): AppData {
  const data = emptyAppData();
  data.mainCurrency = mainCurrency;
  data.money = [];
  data.transfers = [];
  data.splits = [];
  data.budgets = [];
  data.accounts = [];
  data.categories = [];
  data.notes = [];
  data.tasks = [];
  data.usageSnapshots = [];
  data.usageExcludedPackages = [];
  data.timeGoals = [];
  if (usageReadJson !== null) {
    data.usageRead = parsePayload(usageReadJson) as AppData['usageRead'];
  }

  for (const row of rows) {
    const recordType = readText(row.record_type);
    const recordId = readText(row.record_id);
    const payloadJson = readText(row.payload_json);
    if (!recordType || !recordId || payloadJson === null) {
      throw new SqliteDataCorruptError();
    }
    const payload = parsePayload(payloadJson);
    switch (recordType) {
      case 'money':
        data.money.push(payload as MoneyEntry);
        break;
      case 'transfer':
        data.transfers.push(payload as MoneyTransfer);
        break;
      case 'split':
        data.splits.push(payload as MoneySplit);
        break;
      case 'budget':
        data.budgets.push(payload as MoneyBudget);
        break;
      case 'account':
        data.accounts.push(payload as MoneyAccount);
        break;
      case 'category':
        data.categories.push(payload as MoneyCategory);
        break;
      case 'note':
        data.notes.push(payload as Note);
        break;
      case 'task':
        data.tasks.push(payload as Task);
        break;
      case 'usage_snapshot':
        data.usageSnapshots.push(payload as UsageSnapshot);
        break;
      case 'time_goal':
        data.timeGoals.push(payload as TimeGoal);
        break;
      case 'usage_exclusion':
        data.usageExcludedPackages.push(recordId);
        break;
      default:
        throw new SqliteDataCorruptError();
    }
  }
  return data;
}

async function writeAppData(database: SqliteExecutor, data: AppData): Promise<void> {
  const records = collectRecords(data);
  await database.transaction(async tx => {
    await tx.execute('DELETE FROM app_records');
    await tx.execute('DELETE FROM repository_meta');
    await tx.execute('INSERT INTO repository_meta (key, value) VALUES (?, ?)', [
      'schema_version',
      String(REPOSITORY_SCHEMA_VERSION),
    ]);
    await tx.execute('INSERT INTO repository_meta (key, value) VALUES (?, ?)', ['main_currency', data.mainCurrency]);
    await tx.execute('INSERT INTO repository_meta (key, value) VALUES (?, ?)', [
      'usage_read',
      JSON.stringify(data.usageRead),
    ]);
    for (const record of records) {
      await tx.execute(
        'INSERT INTO app_records (record_type, record_id, payload_json, updated_at) VALUES (?, ?, ?, ?)',
        [record.recordType, record.recordId, record.payloadJson, record.updatedAt],
      );
    }
  });
}

function collectRecords(data: AppData): PersistedRecord[] {
  return [
    ...data.money.map(entry => record('money', entry.id, entry, entry.updatedAt)),
    ...data.transfers.map(transfer => record('transfer', transfer.id, transfer, transfer.updatedAt)),
    ...data.splits.map(split => record('split', split.id, split, split.updatedAt)),
    ...data.budgets.map(budget => record('budget', budget.id, budget, budget.updatedAt)),
    ...data.accounts.map(account => record('account', account.id, account)),
    ...data.categories.map(category => record('category', category.id, category)),
    ...data.notes.map(note => record('note', note.id, note, note.updatedAt)),
    ...data.tasks.map(task => record('task', task.id, task, task.updatedAt)),
    ...data.usageSnapshots.map(snapshot => record('usage_snapshot', snapshot.id, snapshot, snapshot.sourceReadAt)),
    ...data.timeGoals.map(goal => record('time_goal', goal.id, goal)),
    ...data.usageExcludedPackages.map(packageName => record('usage_exclusion', packageName, {packageName})),
  ];
}

function record(recordType: RecordType, recordId: string, payload: unknown, updatedAt = DEFAULT_UPDATED_AT): PersistedRecord {
  return {
    recordType,
    recordId,
    payloadJson: JSON.stringify(payload),
    updatedAt,
  };
}

function parsePayload(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new SqliteDataCorruptError();
  }
}

function readText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
