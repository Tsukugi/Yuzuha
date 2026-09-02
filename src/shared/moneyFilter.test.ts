import {filterMoneyEntries, summarizeFilteredMoneyEntries, type MoneyEntryFilter} from './moneyFilter';
import type {MoneyEntry} from '../types/domain';

function entry(overrides: Partial<MoneyEntry>): MoneyEntry {
  return {
    id: overrides.id ?? 'entry',
    kind: overrides.kind ?? 'expense',
    amountMinor: overrides.amountMinor ?? 100,
    currency: overrides.currency ?? 'EUR',
    accountId: overrides.accountId ?? 'account_everyday',
    categoryId: overrides.categoryId ?? 'category_food',
    payeeId: null,
    category: overrides.category ?? 'Food',
    note: '',
    occurredAt: overrides.occurredAt ?? '2026-07-22T12:00:00.000Z',
    createdAt: '2026-07-22T12:00:00.000Z',
    updatedAt: '2026-07-22T12:00:00.000Z',
  };
}

function localIso(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month - 1, day, hour).toISOString();
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

  it('uses the same filter for count and currency-separated totals', () => {
    const filter: MoneyEntryFilter = {period: 'month', kind: 'expense', categoryId: 'category_food', accountId: 'account_everyday'};
    const summary = summarizeFilteredMoneyEntries(
      [...entries, entry({id: 'matching-usd', currency: 'USD', amountMinor: 250})],
      filter,
      new Date(2026, 6, 26),
    );

    expect(summary).toEqual([
      {currency: 'EUR', count: 1, expenseMinor: 100, incomeMinor: 0},
      {currency: 'USD', count: 1, expenseMinor: 250, incomeMinor: 0},
    ]);
  });

  it('uses the configured week start for period filtering', () => {
    const weekEntries = [
      entry({id: 'sunday', occurredAt: '2026-07-26T12:00:00.000Z'}),
      entry({id: 'monday', occurredAt: '2026-07-27T12:00:00.000Z'}),
    ];
    const filter: MoneyEntryFilter = {period: 'week', kind: 'all', categoryId: 'all', accountId: 'all'};

    expect(filterMoneyEntries(weekEntries, filter, new Date(2026, 6, 28), 0).map(item => item.id)).toEqual(['monday', 'sunday']);
    expect(filterMoneyEntries(weekEntries, filter, new Date(2026, 6, 28), 1).map(item => item.id)).toEqual(['monday']);
  });

  it('filters a year and a strict custom local interval', () => {
    const intervalEntries = [
      entry({id: 'year-start', occurredAt: localIso(2026, 1, 1)}),
      entry({id: 'custom-start', occurredAt: localIso(2026, 7, 1)}),
      entry({id: 'custom-end', occurredAt: localIso(2026, 8, 1)}),
      entry({id: 'next-year', occurredAt: localIso(2027, 1, 1)}),
    ];

    expect(filterMoneyEntries(intervalEntries, {
      period: 'year',
      kind: 'all',
      categoryId: 'all',
      accountId: 'all',
    }, new Date(2026, 6, 26)).map(item => item.id)).toEqual(['custom-end', 'custom-start', 'year-start']);
    expect(filterMoneyEntries(intervalEntries, {
      period: 'custom',
      customInterval: {startLocalDate: '2026-07-01', endLocalDate: '2026-08-01'},
      kind: 'all',
      categoryId: 'all',
      accountId: 'all',
    }).map(item => item.id)).toEqual(['custom-start']);
  });

  it('sorts filtered entries newest first without changing source order', () => {
    const entries = [
      entry({id: 'later', occurredAt: '2026-07-28T12:00:00.000Z'}),
      entry({id: 'earlier', occurredAt: '2026-07-26T12:00:00.000Z'}),
    ];
    const filter: MoneyEntryFilter = {period: 'week', kind: 'all', categoryId: 'all', accountId: 'all'};

    expect(filterMoneyEntries(entries, filter, new Date(2026, 6, 28), 0).map(item => item.id)).toEqual(['later', 'earlier']);
    expect(entries.map(item => item.id)).toEqual(['later', 'earlier']);
  });
});
