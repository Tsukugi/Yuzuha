import {createMoneyCsvImportReceipt, normalizeSourceName, validateMoneyCsvImportReceipt} from './moneyCsvImportReceipt';
import type {MoneyEntry} from '../types/domain';

const entry: MoneyEntry = {
  id: 'money_1',
  kind: 'expense',
  amountMinor: 100,
  currency: 'EUR',
  accountId: 'account_everyday',
  categoryId: 'category_food',
  payeeId: null,
  category: 'Food',
  note: '',
  occurredAt: '2026-07-28T12:00:00.000Z',
  createdAt: '2026-07-28T12:00:00.000Z',
  updatedAt: '2026-07-28T12:00:00.000Z',
  splitId: null,
};

describe('money CSV import receipts', () => {
  it('creates a receipt with only the imported entry identity and timestamps', () => {
    const receipt = createMoneyCsvImportReceipt([entry], '  bank export.csv  ', '2026-07-29T12:00:00.000Z');

    expect(receipt).toEqual({
      sourceName: 'bank export.csv',
      importedAt: '2026-07-29T12:00:00.000Z',
      entries: [{id: entry.id, createdAt: entry.createdAt, updatedAt: entry.updatedAt}],
    });
    expect(validateMoneyCsvImportReceipt(receipt)).toBeNull();
  });

  it('uses the neutral source name for blank or oversized names', () => {
    expect(normalizeSourceName('   ')).toBe('money CSV');
    expect(normalizeSourceName('x'.repeat(201))).toBe('money CSV');
  });

  it('rejects duplicate IDs and invalid timestamps', () => {
    expect(validateMoneyCsvImportReceipt({
      sourceName: 'money CSV',
      importedAt: '2026-07-29T12:00:00.000Z',
      entries: [
        {id: 'money_1', createdAt: entry.createdAt, updatedAt: entry.updatedAt},
        {id: 'money_1', createdAt: 'not-a-date', updatedAt: entry.updatedAt},
      ],
    })).toMatch(/invalid/i);
  });

  it('allows a missing imported row so undo can report the exact blocked state', () => {
    expect(validateMoneyCsvImportReceipt({
      sourceName: 'money CSV',
      importedAt: '2026-07-29T12:00:00.000Z',
      entries: [{id: 'deleted-entry', createdAt: entry.createdAt, updatedAt: entry.updatedAt}],
    })).toBeNull();
  });
});
