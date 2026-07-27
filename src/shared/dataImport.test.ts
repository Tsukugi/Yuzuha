import {buildJsonExport} from './dataExport';
import {JsonImportError, parseJsonImport} from './dataImport';
import {migrateStoredData} from '../data/migrations';
import {emptyAppData} from '../types/domain';

describe('JSON restore validation', () => {
  it('parses a current export and reports record counts', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_1',
      title: 'Keep this',
      body: 'Local note',
      isPinned: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    data.attachments.push({
      id: 'attachment_1',
      noteId: 'note_1',
      name: 'reference.txt',
      mimeType: 'text/plain',
      byteSize: 24,
      sha256: 'a'.repeat(64),
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    const preview = parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'));

    expect(preview.data).toEqual(data);
    expect(preview.recordCounts.notes).toBe(1);
    expect(preview.recordCounts.attachments).toBe(1);
    expect(preview.recordCounts.accounts).toBe(1);
    expect(preview.totalRecords).toBe(10);
  });

  it('migrates a supported schema 7 export before validation', () => {
    const data = emptyAppData();
    const legacy: Record<string, unknown> = {...data, schemaVersion: 7};
    delete legacy.recurrences;

    const preview = parseJsonImport(JSON.stringify({
      exportSchemaVersion: 1,
      appSchemaVersion: 7,
      exportedAt: '2026-07-26T12:00:00.000Z',
      data: legacy,
    }));

    expect(preview.data.schemaVersion).toBe(10);
    expect(preview.data.recurrences).toEqual([]);
    expect(preview.data.attachments).toEqual([]);
  });

  it('migrates schema 9 data to an empty attachment collection', () => {
    const legacy: Record<string, unknown> = {...emptyAppData(), schemaVersion: 9};
    delete legacy.attachments;

    const migrated = migrateStoredData(legacy);

    expect(migrated?.schemaVersion).toBe(10);
    expect(migrated?.attachments).toEqual([]);
  });

  it('rejects malformed JSON and duplicate record IDs', () => {
    expect(() => parseJsonImport('{not-json')).toThrow(JsonImportError);

    const data = emptyAppData();
    data.notes.push(
      {
        id: 'note_1',
        title: 'First',
        body: '',
        isPinned: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
      {
        id: 'note_1',
        title: 'Second',
        body: '',
        isPinned: false,
        createdAt: '2026-07-26T00:00:00.000Z',
        updatedAt: '2026-07-26T00:00:00.000Z',
      },
    );

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/duplicate/i);
  });

  it('rejects a split whose lines do not equal the parent amount', () => {
    const data = emptyAppData();
    data.money.push({
      id: 'money_1',
      kind: 'expense',
      amountMinor: 1000,
      currency: 'EUR',
      accountId: 'account_everyday',
      categoryId: null,
      category: 'Split',
      note: '',
      occurredAt: '2026-07-26T12:00:00.000Z',
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
      splitId: 'split_1',
    });
    data.splits.push({
      id: 'split_1',
      parentEntryId: 'money_1',
      lines: [
        {id: 'line_1', categoryId: 'category_food', category: 'Food', amountMinor: 400, note: ''},
        {id: 'line_2', categoryId: 'category_health', category: 'Health', amountMinor: 500, note: ''},
      ],
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/parent amount/i);
  });

  it('rejects an attachment that points to an unknown note', () => {
    const data = emptyAppData();
    data.attachments.push({
      id: 'attachment_1',
      noteId: 'missing_note',
      name: 'reference.txt',
      mimeType: 'text/plain',
      byteSize: 24,
      sha256: 'a'.repeat(64),
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/attachment .* note/i);
  });

  it('rejects a note with more than the attachment limit', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_1',
      title: 'Keep this',
      body: '',
      isPinned: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    data.attachments = Array.from({length: 11}, (_, index) => ({
      id: `attachment_${index}`,
      noteId: 'note_1',
      name: `file-${index}.txt`,
      mimeType: 'text/plain',
      byteSize: 1,
      sha256: String(index % 10).repeat(64),
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    }));

    expect(() => parseJsonImport(buildJsonExport(data, '2026-07-26T12:00:00.000Z'))).toThrow(/more than 10 attachments/i);
  });
});
