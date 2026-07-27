import {buildJsonExport, buildMoneyCsvExport, DATA_EXPORT_SCHEMA_VERSION} from './dataExport';
import {emptyAppData} from '../types/domain';

describe('data exports', () => {
  it('builds a versioned JSON export containing every supported collection', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_1',
      title: 'Export me',
      body: 'Keep this local',
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-26T00:00:00.000Z',
      updatedAt: '2026-07-26T00:00:00.000Z',
    });
    const parsed = JSON.parse(buildJsonExport(data, '2026-07-26T12:00:00.000Z')) as {
      exportSchemaVersion: number;
      appSchemaVersion: number;
      exportedAt: string;
      data: typeof data;
    };

    expect(parsed.exportSchemaVersion).toBe(DATA_EXPORT_SCHEMA_VERSION);
    expect(parsed.appSchemaVersion).toBe(32);
    expect(parsed.exportedAt).toBe('2026-07-26T12:00:00.000Z');
    expect(parsed.data).toEqual(data);
    expect(parsed.data).toHaveProperty('money');
    expect(parsed.data).toHaveProperty('transfers');
    expect(parsed.data).toHaveProperty('splits');
    expect(parsed.data).toHaveProperty('budgets');
    expect(parsed.data).toHaveProperty('usageSnapshots');
    expect(parsed.data).toHaveProperty('timeGoals');
    expect(parsed.data).toHaveProperty('appGroups');
    expect(parsed.data).toHaveProperty('focusSessions');
    expect(parsed.data).toHaveProperty('savedSearches');
    expect(parsed.data).toHaveProperty('payees');
  });

  it('builds a CSV with schema and currency fields and quotes unsafe cells', () => {
    const data = emptyAppData();
    data.money.push({
      id: 'money_1',
      kind: 'expense',
      amountMinor: 1099,
      currency: 'EUR',
      accountId: 'account_everyday',
      categoryId: 'category_food',
      payeeId: null,
      category: 'Food, lunch',
      note: 'A "shared" meal\nwith a friend',
      occurredAt: '2026-07-26T12:00:00.000Z',
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    });

    const csv = buildMoneyCsvExport(data);
    const lines = csv.trimEnd().split('\n');
    expect(lines[0]).toContain('exportSchemaVersion');
    expect(lines[0]).toContain('appSchemaVersion');
    expect(lines[0]).toContain('currency');
    expect(lines[0]).toContain('payeeId');
    expect(lines[1]).toContain('1,32,money_1,expense,1099,EUR');
    expect(csv).toContain('"Food, lunch"');
    expect(csv).toContain('"A ""shared"" meal');
  });

  it('keeps an empty export usable with a header row', () => {
    expect(buildMoneyCsvExport(emptyAppData()).split('\n')).toHaveLength(2);
  });
});
