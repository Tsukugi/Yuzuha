import {DATA_EXPORT_SCHEMA_VERSION} from './dataExport';
import type {AppData, MoneyEntry} from '../types/domain';

export const MONEY_CSV_IMPORT_MAX_BYTES = 5_000_000;
export const MONEY_CSV_IMPORT_MAX_ROWS = 5_000;

const MONEY_CSV_HEADERS = [
  'exportSchemaVersion',
  'appSchemaVersion',
  'id',
  'kind',
  'amountMinor',
  'currency',
  'accountId',
  'categoryId',
  'payeeId',
  'category',
  'note',
  'occurredAt',
  'createdAt',
  'updatedAt',
  'splitId',
] as const;

export interface MoneyCsvImportPreview {
  entries: MoneyEntry[];
  rowCount: number;
  incomeMinorByCurrency: Record<string, number>;
  expenseMinorByCurrency: Record<string, number>;
  errors: string[];
}

export class MoneyCsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyCsvImportError';
  }
}

export function parseMoneyCsvImport(raw: string, current: AppData): MoneyCsvImportPreview {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new MoneyCsvImportError('The money CSV file is empty.');
  }
  if (raw.length > MONEY_CSV_IMPORT_MAX_BYTES) {
    throw new MoneyCsvImportError(`The money CSV file is larger than ${MONEY_CSV_IMPORT_MAX_BYTES} characters.`);
  }

  const rows = parseCsvRows(raw.replace(/^\uFEFF/, ''));
  const header = rows.shift();
  if (!header || !sameValues(header, MONEY_CSV_HEADERS)) {
    throw new MoneyCsvImportError('The money CSV header is not the current Yuzuha format.');
  }
  if (rows.length > MONEY_CSV_IMPORT_MAX_ROWS) {
    throw new MoneyCsvImportError(`The money CSV contains more than ${MONEY_CSV_IMPORT_MAX_ROWS} rows.`);
  }

  const existingIds = new Set(current.money.map(entry => entry.id));
  const accountIds = new Set(current.accounts.map(account => account.id));
  const categoryIds = new Set(current.categories.map(category => category.id));
  const payeeIds = new Set(current.payees.map(payee => payee.id));
  const accountsById = new Map(current.accounts.map(account => [account.id, account]));
  const entries: MoneyEntry[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (row.length !== MONEY_CSV_HEADERS.length) {
      errors.push(`Row ${rowNumber}: expected ${MONEY_CSV_HEADERS.length} columns, found ${row.length}.`);
      return;
    }
    try {
      const entry = parseMoneyRow(row, current.schemaVersion, accountIds, categoryIds, payeeIds, accountsById);
      if (existingIds.has(entry.id)) {
        throw new MoneyCsvImportError(`Row ${rowNumber}: money entry ID ${entry.id} already exists.`);
      }
      existingIds.add(entry.id);
      entries.push(entry);
    } catch (error) {
      errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'invalid money entry.'}`);
    }
  });

  return {
    entries,
    rowCount: rows.length,
    incomeMinorByCurrency: sumByCurrency(entries, 'income'),
    expenseMinorByCurrency: sumByCurrency(entries, 'expense'),
    errors,
  };
}

function parseMoneyRow(
  row: string[],
  appSchemaVersion: number,
  accountIds: Set<string>,
  categoryIds: Set<string>,
  payeeIds: Set<string>,
  accountsById: Map<string, AppData['accounts'][number]>,
): MoneyEntry {
  const exportSchemaVersion = parseInteger(row[0], 'export schema version');
  if (exportSchemaVersion !== DATA_EXPORT_SCHEMA_VERSION) {
    throw new MoneyCsvImportError('unsupported export schema version.');
  }
  if (parseInteger(row[1], 'app schema version') !== appSchemaVersion) {
    throw new MoneyCsvImportError('unsupported app schema version.');
  }

  const id = requiredText(row[2], 'ID');
  const kind = row[3];
  if (kind !== 'income' && kind !== 'expense') {
    throw new MoneyCsvImportError('kind must be income or expense.');
  }
  const amountMinor = parseInteger(row[4], 'amount');
  if (amountMinor <= 0) {
    throw new MoneyCsvImportError('amount must be positive.');
  }
  const currency = row[5];
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new MoneyCsvImportError('currency must be three uppercase letters.');
  }

  const accountId = optionalText(row[6]);
  if (accountId !== null && !accountIds.has(accountId)) {
    throw new MoneyCsvImportError(`account ${accountId} is missing from this workspace.`);
  }
  const account = accountId === null ? null : accountsById.get(accountId) ?? null;
  if (account && account.currency !== currency) {
    throw new MoneyCsvImportError(`account ${accountId} uses ${account.currency}, not ${currency}.`);
  }

  const categoryId = optionalText(row[7]);
  if (categoryId !== null && !categoryIds.has(categoryId)) {
    throw new MoneyCsvImportError(`category ${categoryId} is missing from this workspace.`);
  }
  const payeeId = optionalText(row[8]);
  if (payeeId !== null && !payeeIds.has(payeeId)) {
    throw new MoneyCsvImportError(`payee ${payeeId} is missing from this workspace.`);
  }
  const splitId = optionalText(row[14]);
  if (splitId !== null) {
    throw new MoneyCsvImportError('split-linked rows require a JSON export or encrypted backup.');
  }

  return {
    id,
    kind,
    amountMinor,
    currency,
    accountId,
    categoryId,
    payeeId,
    category: row[9],
    note: row[10],
    occurredAt: validIsoDate(row[11], 'occurred date'),
    createdAt: validIsoDate(row[12], 'created date'),
    updatedAt: validIsoDate(row[13], 'updated date'),
    splitId: null,
  };
}

function parseCsvRows(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let closedQuote = false;

  const finishField = () => {
    row.push(field);
    field = '';
    closedQuote = false;
  };
  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (inQuotes) {
      if (character === '"') {
        if (raw[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (closedQuote) {
      if (character === ',') {
        finishField();
      } else if (character === '\n') {
        finishRow();
      } else if (character === '\r') {
        if (raw[index + 1] === '\n') {
          index += 1;
        }
        finishRow();
      } else {
        throw new MoneyCsvImportError('The CSV contains characters after a quoted field.');
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new MoneyCsvImportError('The CSV contains a quote inside an unquoted field.');
      }
      inQuotes = true;
    } else if (character === ',') {
      finishField();
    } else if (character === '\n') {
      finishRow();
    } else if (character === '\r') {
      if (raw[index + 1] === '\n') {
        index += 1;
      }
      finishRow();
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new MoneyCsvImportError('The CSV contains an unterminated quoted field.');
  }
  if (field.length > 0 || row.length > 0 || closedQuote) {
    finishField();
    rows.push(row);
  }
  return rows;
}

function parseInteger(value: string, label: string): number {
  if (!/^-?(0|[1-9]\d*)$/.test(value)) {
    throw new MoneyCsvImportError(`${label} must be an integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new MoneyCsvImportError(`${label} is outside the safe integer range.`);
  }
  return parsed;
}

function requiredText(value: string, label: string): string {
  if (!value) {
    throw new MoneyCsvImportError(`${label} is required.`);
  }
  return value;
}

function optionalText(value: string): string | null {
  return value === '' ? null : value;
}

function validIsoDate(value: string, label: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) {
    throw new MoneyCsvImportError(`${label} is invalid.`);
  }
  return value;
}

function sameValues(actual: string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function sumByCurrency(entries: MoneyEntry[], kind: MoneyEntry['kind']): Record<string, number> {
  return entries.reduce<Record<string, number>>((totals, entry) => {
    if (entry.kind === kind) {
      totals[entry.currency] = (totals[entry.currency] ?? 0) + entry.amountMinor;
    }
    return totals;
  }, {});
}
