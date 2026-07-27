import {buildMoneyCsvExport} from './dataExport';
import {parseMoneyCsvImport, MoneyCsvImportError} from './moneyCsvImport';
import {emptyAppData, type MoneyEntry} from '../types/domain';

describe('money CSV import', () => {
  it('parses current exported rows, quoted notes, and currency totals', () => {
    const data = emptyAppData();
    data.payees.push({id: 'payee_market', name: 'Market', isArchived: false, createdAt: '2026-07-28T00:00:00.000Z', updatedAt: '2026-07-28T00:00:00.000Z'});
    const exported = buildMoneyCsvExport({
      ...data,
      money: [{
        id: 'money_import_1',
        kind: 'expense',
        amountMinor: 1250,
        currency: 'EUR',
        accountId: 'account_everyday',
        categoryId: 'category_food',
        payeeId: 'payee_market',
        category: 'Food',
        note: 'Lunch, shared\nwith team',
        occurredAt: '2026-07-28T12:00:00.000Z',
        createdAt: '2026-07-28T12:00:00.000Z',
        updatedAt: '2026-07-28T12:00:00.000Z',
        splitId: null,
      }],
    });
    const preview = parseMoneyCsvImport(exported, data);

    expect(preview.errors).toEqual([]);
    expect(preview.rowCount).toBe(1);
    expect(preview.entries[0]).toMatchObject({id: 'money_import_1', amountMinor: 1250, payeeId: 'payee_market', note: 'Lunch, shared\nwith team'});
    expect(preview.expenseMinorByCurrency).toEqual({EUR: 1250});
  });

  it('reports duplicate, reference, split, and malformed rows without creating partial entries', () => {
    const data = emptyAppData();
    const header = buildMoneyCsvExport(data).trim();
    const row = (id: string, accountId = 'account_everyday', splitId = '') => [
      '1', '32', id, 'expense', '100', 'EUR', accountId, 'category_food', '', 'Food', 'note',
      '2026-07-28T12:00:00.000Z', '2026-07-28T12:00:00.000Z', '2026-07-28T12:00:00.000Z', splitId,
    ].join(',');
    const existing: MoneyEntry = {
      id: 'money_existing', kind: 'expense', amountMinor: 1, currency: 'EUR', accountId: 'account_everyday', categoryId: 'category_food', payeeId: null, category: 'Food', note: '', occurredAt: '2026-07-28T12:00:00.000Z', createdAt: '2026-07-28T12:00:00.000Z', updatedAt: '2026-07-28T12:00:00.000Z', splitId: null,
    };
    const current = {...data, money: [existing]};
    const preview = parseMoneyCsvImport(`${header}\n${row('money_existing')}\n${row('money_missing', 'missing_account')}\n${row('money_split', 'account_everyday', 'split_1')}\n${row('money_bad').replace(',100,', ',not-number,')}`, current);

    expect(preview.entries).toEqual([]);
    expect(preview.errors).toHaveLength(4);
    expect(preview.errors.join(' ')).toMatch(/already exists|missing from this workspace|split-linked|integer/);
  });

  it('rejects a non-current header before reading rows', () => {
    expect(() => parseMoneyCsvImport('old,format\n1,2\n', emptyAppData())).toThrow(MoneyCsvImportError);
  });
});
