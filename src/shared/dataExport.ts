import type {AppData} from '../types/domain';

export const DATA_EXPORT_SCHEMA_VERSION = 1 as const;

export interface JsonExportEnvelope {
  exportSchemaVersion: typeof DATA_EXPORT_SCHEMA_VERSION;
  appSchemaVersion: AppData['schemaVersion'];
  exportedAt: string;
  data: AppData;
}

export function buildJsonExport(data: AppData, exportedAt: string): string {
  const envelope: JsonExportEnvelope = {
    exportSchemaVersion: DATA_EXPORT_SCHEMA_VERSION,
    appSchemaVersion: data.schemaVersion,
    exportedAt,
    data,
  };
  return JSON.stringify(envelope, null, 2);
}

export function buildMoneyCsvExport(data: AppData): string {
  const headers = [
    'exportSchemaVersion',
    'appSchemaVersion',
    'id',
    'kind',
    'amountMinor',
    'currency',
    'accountId',
    'categoryId',
    'category',
    'note',
    'occurredAt',
    'createdAt',
    'updatedAt',
    'splitId',
  ];
  const rows = data.money.map(entry => [
    DATA_EXPORT_SCHEMA_VERSION,
    data.schemaVersion,
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
  ]);
  return [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
}

function csvCell(value: string | number | null): string {
  if (value === null) {
    return '';
  }
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
