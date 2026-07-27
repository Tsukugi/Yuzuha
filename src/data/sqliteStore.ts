import {emptyAppData} from '../types/domain';
import type {
  AppData,
  Attachment,
  MoneyAccount,
  MoneyBudget,
  MoneyCategory,
  MoneyEntry,
  MoneyRecurrenceRule,
  MoneySplit,
  MoneySplitLine,
  MoneyTransfer,
  Note,
  NotificationSettings,
  SavedSearch,
  Task,
  TaskDependency,
  TaskList,
  TaskRecurrenceRule,
  TimeGoal,
  UsageSnapshot,
} from '../types/domain';
import {isValidTaskReminderSnoozeDuration, validateQuietHoursDraft} from '../shared/notificationSettings';
import {isValidTaskRecurrenceReminderLocalTime} from '../shared/taskRecurrence';
import {validateCurrentAppData} from '../shared/dataImport';

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

const REPOSITORY_SCHEMA_VERSION = 2;
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

const CREATE_MONEY_ENTRIES_TABLE = `
  CREATE TABLE IF NOT EXISTS money_entries (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    account_id TEXT,
    category_id TEXT,
    category TEXT NOT NULL,
    note TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    split_id TEXT
  )
`;

const CREATE_MONEY_ENTRIES_INDEX = `
  CREATE INDEX IF NOT EXISTS money_entries_occurred_idx
  ON money_entries (occurred_at, id)
`;

const CREATE_MONEY_TRANSFERS_TABLE = `
  CREATE TABLE IF NOT EXISTS money_transfers (
    id TEXT PRIMARY KEY NOT NULL,
    from_account_id TEXT NOT NULL,
    to_account_id TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    note TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const CREATE_MONEY_SPLITS_TABLE = `
  CREATE TABLE IF NOT EXISTS money_splits (
    id TEXT PRIMARY KEY NOT NULL,
    parent_entry_id TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const CREATE_MONEY_SPLIT_LINES_TABLE = `
  CREATE TABLE IF NOT EXISTS money_split_lines (
    id TEXT PRIMARY KEY NOT NULL,
    split_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY (split_id) REFERENCES money_splits(id) ON DELETE CASCADE
  )
`;

const CREATE_MONEY_SPLIT_LINES_INDEX = `
  CREATE INDEX IF NOT EXISTS money_split_lines_split_idx
  ON money_split_lines (split_id, id)
`;

const CREATE_MONEY_BUDGETS_TABLE = `
  CREATE TABLE IF NOT EXISTS money_budgets (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT NOT NULL,
    category TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    period TEXT NOT NULL,
    rollover TEXT NOT NULL,
    is_archived INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const CREATE_MONEY_BUDGETS_INDEX = `
  CREATE INDEX IF NOT EXISTS money_budgets_category_period_idx
  ON money_budgets (category_id, period, is_archived)
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
  | 'recurrence'
  | 'account'
  | 'category'
  | 'note'
  | 'attachment'
  | 'saved_search'
  | 'task_list'
  | 'task_recurrence'
  | 'task'
  | 'task_dependency'
  | 'usage_snapshot'
  | 'time_goal'
  | 'usage_exclusion';

interface PersistedRecord extends Record<string, unknown> {
  recordType: RecordType;
  recordId: string;
  payloadJson: string;
  updatedAt: string;
}

export class SqliteWorkspaceStore implements WorkspaceStore {
  private initialized: Promise<void> | null = null;

  constructor(
    private readonly database: SqliteExecutor,
  ) {}

  async load(): Promise<AppData> {
    await this.ensureInitialized();
    return readAppData(this.database);
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
    await this.database.execute(CREATE_MONEY_ENTRIES_TABLE);
    await this.database.execute(CREATE_MONEY_ENTRIES_INDEX);
    await this.database.execute(CREATE_MONEY_TRANSFERS_TABLE);
    await this.database.execute(CREATE_MONEY_SPLITS_TABLE);
    await this.database.execute(CREATE_MONEY_SPLIT_LINES_TABLE);
    await this.database.execute(CREATE_MONEY_SPLIT_LINES_INDEX);
    await this.database.execute(CREATE_MONEY_BUDGETS_TABLE);
    await this.database.execute(CREATE_MONEY_BUDGETS_INDEX);

    const result = await this.database.execute('SELECT value FROM repository_meta WHERE key = ?', ['schema_version']);
    const version = readText(result.rows[0]?.value);
    if (version === null) {
      await writeAppData(this.database, emptyAppData());
      return;
    }
    if (version !== String(REPOSITORY_SCHEMA_VERSION)) {
      throw new SqliteSchemaError(version);
    }
  }
}

async function readAppData(database: SqliteExecutor): Promise<AppData> {
  const meta = await database.execute('SELECT value FROM repository_meta WHERE key = ?', ['usage_read']);
  const currency = await database.execute('SELECT value FROM repository_meta WHERE key = ?', ['main_currency']);
  const notificationSettings = await database.execute('SELECT value FROM repository_meta WHERE key = ?', ['notification_settings']);
  const records = await database.execute(
    'SELECT record_type, record_id, payload_json, updated_at FROM app_records ORDER BY record_type, record_id',
  );
  const normalizedRecords = await readNormalizedRecords(database);
  const data = decodeAppData(
    [...records.rows, ...normalizedRecords],
    readText(currency.rows[0]?.value) ?? 'EUR',
    readText(meta.rows[0]?.value),
    readText(notificationSettings.rows[0]?.value),
  );
  try {
    validateCurrentAppData(data);
  } catch {
    throw new SqliteDataCorruptError();
  }
  return data;
}

async function readNormalizedRecords(database: SqliteExecutor): Promise<Array<Record<string, unknown>>> {
  const records: Array<Record<string, unknown>> = [];
  const entries = await database.execute(
    'SELECT id, kind, amount_minor, currency, account_id, category_id, category, note, occurred_at, created_at, updated_at, split_id FROM money_entries ORDER BY occurred_at, id',
  );
  for (const row of entries.rows) {
    const splitId = readNullableText(row.split_id);
    const entry: MoneyEntry = {
      id: readRequiredText(row.id),
      kind: readRequiredText(row.kind) as MoneyEntry['kind'],
      amountMinor: readRequiredNumber(row.amount_minor),
      currency: readRequiredText(row.currency),
      accountId: readNullableText(row.account_id),
      categoryId: readNullableText(row.category_id),
      category: readRequiredText(row.category),
      note: readRequiredText(row.note),
      occurredAt: readRequiredText(row.occurred_at),
      createdAt: readRequiredText(row.created_at),
      updatedAt: readRequiredText(row.updated_at),
      ...(splitId === null ? {} : {splitId}),
    };
    records.push(normalizedRecord('money', entry.id, entry, entry.updatedAt));
  }

  const transfers = await database.execute(
    'SELECT id, from_account_id, to_account_id, amount_minor, currency, note, occurred_at, created_at, updated_at FROM money_transfers ORDER BY occurred_at, id',
  );
  for (const row of transfers.rows) {
    const transfer: MoneyTransfer = {
      id: readRequiredText(row.id),
      fromAccountId: readRequiredText(row.from_account_id),
      toAccountId: readRequiredText(row.to_account_id),
      amountMinor: readRequiredNumber(row.amount_minor),
      currency: readRequiredText(row.currency),
      note: readRequiredText(row.note),
      occurredAt: readRequiredText(row.occurred_at),
      createdAt: readRequiredText(row.created_at),
      updatedAt: readRequiredText(row.updated_at),
    };
    records.push(normalizedRecord('transfer', transfer.id, transfer, transfer.updatedAt));
  }

  const splitLines = await database.execute(
    'SELECT id, split_id, category_id, category, amount_minor, note FROM money_split_lines ORDER BY split_id, id',
  );
  const linesBySplit = new Map<string, MoneySplitLine[]>();
  for (const row of splitLines.rows) {
    const splitId = readRequiredText(row.split_id);
    const lines = linesBySplit.get(splitId) ?? [];
    lines.push({
      id: readRequiredText(row.id),
      categoryId: readRequiredText(row.category_id),
      category: readRequiredText(row.category),
      amountMinor: readRequiredNumber(row.amount_minor),
      note: readRequiredText(row.note),
    });
    linesBySplit.set(splitId, lines);
  }

  const splits = await database.execute(
    'SELECT id, parent_entry_id, created_at, updated_at FROM money_splits ORDER BY id',
  );
  for (const row of splits.rows) {
    const splitId = readRequiredText(row.id);
    const split: MoneySplit = {
      id: splitId,
      parentEntryId: readRequiredText(row.parent_entry_id),
      lines: linesBySplit.get(splitId) ?? [],
      createdAt: readRequiredText(row.created_at),
      updatedAt: readRequiredText(row.updated_at),
    };
    records.push(normalizedRecord('split', split.id, split, split.updatedAt));
  }
  if ([...linesBySplit.keys()].some(splitId => !splits.rows.some(row => readText(row.id) === splitId))) {
    throw new SqliteDataCorruptError();
  }

  const budgets = await database.execute(
    'SELECT id, category_id, category, amount_minor, currency, period, rollover, is_archived, created_at, updated_at FROM money_budgets ORDER BY id',
  );
  for (const row of budgets.rows) {
    const budget: MoneyBudget = {
      id: readRequiredText(row.id),
      categoryId: readRequiredText(row.category_id),
      category: readRequiredText(row.category),
      amountMinor: readRequiredNumber(row.amount_minor),
      currency: readRequiredText(row.currency),
      period: readRequiredText(row.period) as MoneyBudget['period'],
      rollover: readRequiredText(row.rollover) as MoneyBudget['rollover'],
      isArchived: readRequiredBoolean(row.is_archived),
      createdAt: readRequiredText(row.created_at),
      updatedAt: readRequiredText(row.updated_at),
    };
    records.push(normalizedRecord('budget', budget.id, budget, budget.updatedAt));
  }
  return records;
}

export function decodeAppData(
  rows: Array<Record<string, unknown>>,
  mainCurrency: string,
  usageReadJson: string | null,
  notificationSettingsJson: string | null = null,
): AppData {
  const data = emptyAppData();
  data.mainCurrency = mainCurrency;
  data.money = [];
  data.transfers = [];
  data.splits = [];
  data.budgets = [];
  data.recurrences = [];
  data.accounts = [];
  data.categories = [];
  data.notes = [];
  data.attachments = [];
  data.savedSearches = [];
  data.taskLists = [];
  data.taskRecurrences = [];
  data.tasks = [];
  data.taskDependencies = [];
  data.usageSnapshots = [];
  data.usageExcludedPackages = [];
  data.timeGoals = [];
  if (usageReadJson !== null) {
    data.usageRead = parsePayload(usageReadJson) as AppData['usageRead'];
  }
  if (notificationSettingsJson === null) {
    throw new SqliteDataCorruptError();
  }
  const parsedSettings = parsePayload(notificationSettingsJson);
  if (!isNotificationSettingsPayload(parsedSettings)) {
    throw new SqliteDataCorruptError();
  }
  data.notificationSettings = parsedSettings;

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
      case 'budget': {
        const budget = payload as MoneyBudget;
        if (budget.rollover !== 'none' && budget.rollover !== 'carry-forward') {
          throw new SqliteDataCorruptError();
        }
        data.budgets.push(budget);
        break;
      }
      case 'recurrence': {
        const recurrence = payload as MoneyRecurrenceRule;
        if (recurrence.missedOccurrencePolicy !== 'all' && recurrence.missedOccurrencePolicy !== 'one' && recurrence.missedOccurrencePolicy !== 'skip') {
          throw new SqliteDataCorruptError();
        }
        data.recurrences.push(recurrence);
        break;
      }
      case 'account':
        data.accounts.push(payload as MoneyAccount);
        break;
      case 'category':
        data.categories.push(payload as MoneyCategory);
        break;
      case 'note': {
        if (typeof payload !== 'object' || payload === null) {
          throw new SqliteDataCorruptError();
        }
        const notePayload = payload as {tags?: unknown; isPinned?: unknown; isArchived?: unknown};
        if (!Array.isArray(notePayload.tags) || notePayload.tags.some(tag => typeof tag !== 'string')) {
          throw new SqliteDataCorruptError();
        }
        if (typeof notePayload.isPinned !== 'boolean' || typeof notePayload.isArchived !== 'boolean') {
          throw new SqliteDataCorruptError();
        }
        data.notes.push(payload as Note);
        break;
      }
      case 'attachment':
        data.attachments.push(payload as Attachment);
        break;
      case 'saved_search':
        data.savedSearches.push(payload as SavedSearch);
        break;
      case 'task_list':
        data.taskLists.push(payload as TaskList);
        break;
      case 'task_recurrence': {
        if (typeof payload !== 'object' || payload === null) {
          throw new SqliteDataCorruptError();
        }
        const recurrencePayload = payload as Record<string, unknown>;
        if (recurrencePayload.reminderLocalTime !== null && !isValidTaskRecurrenceReminderLocalTime(recurrencePayload.reminderLocalTime)) {
          throw new SqliteDataCorruptError();
        }
        data.taskRecurrences.push(recurrencePayload as unknown as TaskRecurrenceRule);
        break;
      }
      case 'task': {
        const taskPayload = payload as Task;
        if ((taskPayload.sourceNoteId !== null && typeof taskPayload.sourceNoteId !== 'string') ||
            (taskPayload.priority !== 'low' && taskPayload.priority !== 'normal' && taskPayload.priority !== 'high') ||
            typeof taskPayload.listId !== 'string' ||
            (taskPayload.recurrenceRuleId !== null && typeof taskPayload.recurrenceRuleId !== 'string') ||
            (taskPayload.reminderAtMillis !== null && (!Number.isSafeInteger(taskPayload.reminderAtMillis) || taskPayload.reminderAtMillis <= 0))) {
          throw new SqliteDataCorruptError();
        }
        data.tasks.push(taskPayload);
        break;
      }
      case 'task_dependency': {
        const dependencyPayload = payload as TaskDependency;
        if (dependencyPayload.dependencyType !== 'completed' || typeof dependencyPayload.sourceTaskId !== 'string' || typeof dependencyPayload.dependentTaskId !== 'string') {
          throw new SqliteDataCorruptError();
        }
        data.taskDependencies.push(dependencyPayload);
        break;
      }
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
  await database.transaction(async tx => {
    await writeAppDataInTransaction(tx, data);
  });
}

async function writeAppDataInTransaction(tx: SqliteExecutor, data: AppData): Promise<void> {
  const records = collectNonMoneyRecords(data);
  await tx.execute('DELETE FROM app_records');
  await tx.execute('DELETE FROM money_split_lines');
  await tx.execute('DELETE FROM money_splits');
  await tx.execute('DELETE FROM money_transfers');
  await tx.execute('DELETE FROM money_entries');
  await tx.execute('DELETE FROM money_budgets');
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
  await tx.execute('INSERT INTO repository_meta (key, value) VALUES (?, ?)', [
    'notification_settings',
    JSON.stringify(data.notificationSettings),
  ]);
  for (const record of records) {
    await tx.execute(
      'INSERT INTO app_records (record_type, record_id, payload_json, updated_at) VALUES (?, ?, ?, ?)',
      [record.recordType, record.recordId, record.payloadJson, record.updatedAt],
    );
  }
  for (const entry of data.money) {
    await tx.execute(
      'INSERT INTO money_entries (id, kind, amount_minor, currency, account_id, category_id, category, note, occurred_at, created_at, updated_at, split_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        entry.id,
        entry.kind,
        entry.amountMinor,
        entry.currency,
        entry.accountId,
        entry.categoryId,
        entry.category,
        entry.note,
        entry.occurredAt,
        entry.createdAt,
        entry.updatedAt,
        entry.splitId ?? null,
      ],
    );
  }
  for (const transfer of data.transfers) {
    await tx.execute(
      'INSERT INTO money_transfers (id, from_account_id, to_account_id, amount_minor, currency, note, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        transfer.id,
        transfer.fromAccountId,
        transfer.toAccountId,
        transfer.amountMinor,
        transfer.currency,
        transfer.note,
        transfer.occurredAt,
        transfer.createdAt,
        transfer.updatedAt,
      ],
    );
  }
  for (const split of data.splits) {
    await tx.execute(
      'INSERT INTO money_splits (id, parent_entry_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [split.id, split.parentEntryId, split.createdAt, split.updatedAt],
    );
    for (const line of split.lines) {
      await tx.execute(
        'INSERT INTO money_split_lines (id, split_id, category_id, category, amount_minor, note) VALUES (?, ?, ?, ?, ?, ?)',
        [line.id, split.id, line.categoryId, line.category, line.amountMinor, line.note],
      );
    }
  }
  for (const budget of data.budgets) {
    await tx.execute(
      'INSERT INTO money_budgets (id, category_id, category, amount_minor, currency, period, rollover, is_archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        budget.id,
        budget.categoryId,
        budget.category,
        budget.amountMinor,
        budget.currency,
        budget.period,
        budget.rollover,
        budget.isArchived ? 1 : 0,
        budget.createdAt,
        budget.updatedAt,
      ],
    );
  }
}

function collectNonMoneyRecords(data: AppData): PersistedRecord[] {
  return [
    ...data.accounts.map(account => record('account', account.id, account)),
    ...data.categories.map(category => record('category', category.id, category)),
    ...data.notes.map(note => record('note', note.id, note, note.updatedAt)),
    ...data.attachments.map(attachment => record('attachment', attachment.id, attachment, attachment.updatedAt)),
    ...data.savedSearches.map(savedSearch => record('saved_search', savedSearch.id, savedSearch, savedSearch.updatedAt)),
    ...data.taskLists.map(taskList => record('task_list', taskList.id, taskList, taskList.updatedAt)),
    ...data.taskRecurrences.map(rule => record('task_recurrence', rule.id, rule, rule.updatedAt)),
    ...data.tasks.map(task => record('task', task.id, task, task.updatedAt)),
    ...data.taskDependencies.map(dependency => record('task_dependency', dependency.id, dependency, dependency.updatedAt)),
    ...data.usageSnapshots.map(snapshot => record('usage_snapshot', snapshot.id, snapshot, snapshot.sourceReadAt)),
    ...data.timeGoals.map(goal => record('time_goal', goal.id, goal)),
    ...data.recurrences.map(rule => record('recurrence', rule.id, rule, rule.updatedAt)),
    ...data.usageExcludedPackages.map(packageName => record('usage_exclusion', packageName, {packageName})),
  ];
}

function normalizedRecord(recordType: RecordType, recordId: string, payload: unknown, updatedAt: string): Record<string, unknown> {
  return {
    record_type: recordType,
    record_id: recordId,
    payload_json: JSON.stringify(payload),
    updated_at: updatedAt,
  };
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

function isNotificationSettingsPayload(value: unknown): value is NotificationSettings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const settings = value as Partial<NotificationSettings>;
  const start = settings.quietHoursStartLocalTime;
  const end = settings.quietHoursEndLocalTime;
  const snoozeDurationMinutes = settings.snoozeDurationMinutes;
  const taskRemindersEnabled = settings.taskRemindersEnabled;
  const recurringTaskRemindersEnabled = settings.recurringTaskRemindersEnabled;
  if ((start !== null && typeof start !== 'string') || (end !== null && typeof end !== 'string') ||
      !isValidTaskReminderSnoozeDuration(snoozeDurationMinutes) || typeof taskRemindersEnabled !== 'boolean' ||
      typeof recurringTaskRemindersEnabled !== 'boolean') {
    return false;
  }
  const startInput = typeof start === 'string' ? start : '';
  const endInput = typeof end === 'string' ? end : '';
  return validateQuietHoursDraft(startInput, endInput) === null;
}

function readText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readRequiredText(value: unknown): string {
  const text = readText(value);
  if (text === null) {
    throw new SqliteDataCorruptError();
  }
  return text;
}

function readNullableText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return readRequiredText(value);
}

function readRequiredNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new SqliteDataCorruptError();
  }
  return value;
}

function readRequiredBoolean(value: unknown): boolean {
  if (value === 0) {
    return false;
  }
  if (value === 1) {
    return true;
  }
  throw new SqliteDataCorruptError();
}
