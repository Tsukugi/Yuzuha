import type {MoneyCsvImportReceipt, MoneyEntry} from '../types/domain';

export const MONEY_CSV_IMPORT_RECEIPT_MAX_ENTRIES = 5_000;
export const MONEY_CSV_IMPORT_SOURCE_NAME_MAX_LENGTH = 200;

export function createMoneyCsvImportReceipt(
  entries: MoneyEntry[],
  sourceName: string,
  importedAt: string,
): MoneyCsvImportReceipt {
  return {
    sourceName: normalizeSourceName(sourceName),
    importedAt,
    entries: entries.map(entry => ({id: entry.id, createdAt: entry.createdAt, updatedAt: entry.updatedAt})),
  };
}

export function validateMoneyCsvImportReceipt(
  receipt: unknown,
): string | null {
  if (receipt === null) {
    return null;
  }
  if (!isRecord(receipt) || typeof receipt.sourceName !== 'string' || normalizeSourceName(receipt.sourceName) !== receipt.sourceName ||
      receipt.sourceName.length === 0 || receipt.sourceName.length > MONEY_CSV_IMPORT_SOURCE_NAME_MAX_LENGTH ||
      !isIsoDate(receipt.importedAt) || !Array.isArray(receipt.entries) || receipt.entries.length === 0 ||
      receipt.entries.length > MONEY_CSV_IMPORT_RECEIPT_MAX_ENTRIES) {
    return 'The latest money CSV import receipt is invalid.';
  }
  const ids = new Set<string>();
  for (const entry of receipt.entries) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id.trim() === '' || ids.has(entry.id) ||
        !isIsoDate(entry.createdAt) || !isIsoDate(entry.updatedAt)) {
      return 'The latest money CSV import receipt is invalid.';
    }
    ids.add(entry.id);
  }
  return null;
}

export function normalizeSourceName(sourceName: string): string {
  const trimmed = sourceName.trim();
  return trimmed.length > 0 && trimmed.length <= MONEY_CSV_IMPORT_SOURCE_NAME_MAX_LENGTH ? trimmed : 'money CSV';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
