import {formatMoney, sumMoney} from './format';
import type {MoneyEntry} from '../types/domain';

const entry = (kind: MoneyEntry['kind'], amountMinor: number): MoneyEntry => ({
  id: `${kind}-${amountMinor}`,
  kind,
  amountMinor,
  currency: 'EUR',
  accountId: 'account_everyday',
  categoryId: 'category_food',
  category: 'test',
  note: '',
  occurredAt: '2026-07-26T00:00:00.000Z',
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
});

describe('money helpers', () => {
  it('sums only entries of the requested kind', () => {
    expect(sumMoney([entry('expense', 1250), entry('income', 5000)], 'expense')).toBe(1250);
  });

  it('formats minor units without floating point storage', () => {
    expect(formatMoney(1099, 'EUR')).toBe('EUR 10.99');
  });
});
