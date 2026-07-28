import {buildMoneyChartData} from './moneyChart';
import {getPeriodRange} from './period';
import type {MoneyEntry, MoneySplit} from '../types/domain';

const baseEntry: MoneyEntry = {
  id: 'entry',
  kind: 'expense',
  amountMinor: 1000,
  currency: 'EUR',
  accountId: 'account',
  categoryId: 'food',
  payeeId: null,
  category: 'Food',
  note: '',
  occurredAt: '2026-07-28T12:00:00.000Z',
  createdAt: '2026-07-28T12:00:00.000Z',
  updatedAt: '2026-07-28T12:00:00.000Z',
};

const all = {kind: 'all' as const, categoryId: 'all' as const, accountId: 'all' as const};

describe('money chart data', () => {
  it('groups category spending and keeps the daily range complete', () => {
    const data = buildMoneyChartData(
      [
        baseEntry,
        {...baseEntry, id: 'income', kind: 'income', amountMinor: 2500, category: 'Salary', categoryId: 'salary'},
      ],
      [],
      getPeriodRange(new Date(2026, 6, 28, 12), 'week', 1),
      'EUR',
      all,
    );

    expect(data.categories).toEqual([
      {name: 'Food', expenseMinor: 1000, incomeMinor: 0},
      {name: 'Salary', expenseMinor: 0, incomeMinor: 2500},
    ]);
    expect(data.daily).toHaveLength(7);
    expect(data.daily.find(point => point.localDate === '2026-07-28')).toMatchObject({expenseMinor: 1000, incomeMinor: 2500});
  });

  it('aggregates split lines without adding the parent amount', () => {
    const split: MoneySplit = {
      id: 'split',
      parentEntryId: baseEntry.id,
      lines: [
        {id: 'line-food', categoryId: 'food', category: 'Food', amountMinor: 600, note: ''},
        {id: 'line-transport', categoryId: 'transport', category: 'Transport', amountMinor: 400, note: ''},
      ],
      createdAt: baseEntry.createdAt,
      updatedAt: baseEntry.updatedAt,
    };

    const data = buildMoneyChartData(
      [baseEntry],
      [split],
      getPeriodRange(new Date(2026, 6, 28, 12), 'day'),
      'EUR',
      all,
    );

    expect(data.categories).toEqual([
      {name: 'Food', expenseMinor: 600, incomeMinor: 0},
      {name: 'Transport', expenseMinor: 400, incomeMinor: 0},
    ]);
    expect(data.daily[0]).toMatchObject({expenseMinor: 1000, incomeMinor: 0});
  });
});
