import {filterMoneyEntries, type MoneyEntryFilter} from './moneyFilter';
import type {MoneyEntry} from '../types/domain';

function entry(overrides: Partial<MoneyEntry>): MoneyEntry {
  return {
    id: overrides.id ?? 'entry',
    kind: overrides.kind ?? 'expense',
    amountMinor: overrides.amountMinor ?? 100,
    currency: overrides.currency ?? 'EUR',
    accountId: overrides.accountId ?? 'account_everyday',
    categoryId: overrides.categoryId ?? 'category_food',
    category: overrides.category ?? 'Food',
    note: '',
    occurredAt: overrides.occurredAt ?? '2026-07-22T12:00:00.000Z',
    createdAt: '2026-07-22T12:00:00.000Z',
    updatedAt: '2026-07-22T12:00:00.000Z',
  };
}

describe('money entry filters', () => {
  const entries = [
    entry({id: 'matching', categoryId: 'category_food', accountId: 'account_everyday'}),
    entry({id: 'wrong-kind', kind: 'income', categoryId: 'category_food'}),
    entry({id: 'wrong-category', categoryId: 'category_transport'}),
    entry({id: 'wrong-account', accountId: 'account_savings'}),
    entry({id: 'outside-period', occurredAt: '2026-06-22T12:00:00.000Z'}),
  ];

  it('applies period, kind, category, and account together', () => {
    const filter: MoneyEntryFilter = {period: 'month', kind: 'expense', categoryId: 'category_food', accountId: 'account_everyday'};
    expect(filterMoneyEntries(entries, filter, new Date(2026, 6, 26)).map(item => item.id)).toEqual(['matching']);
  });

  it('returns every entry when all filters are open', () => {
    expect(filterMoneyEntries(entries, {period: 'all', kind: 'all', categoryId: 'all', accountId: 'all'})).toHaveLength(5);
  });
});
