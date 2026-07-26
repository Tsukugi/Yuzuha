import {getPeriodRange} from './period';
import {buildMoneyReport} from './moneyReport';
import type {MoneyEntry} from '../types/domain';

function entry(overrides: Partial<MoneyEntry>): MoneyEntry {
  return {
    id: overrides.id ?? 'money_1',
    kind: overrides.kind ?? 'expense',
    amountMinor: overrides.amountMinor ?? 100,
    currency: overrides.currency ?? 'EUR',
    accountId: 'account_everyday',
    categoryId: 'category_food',
    category: overrides.category ?? 'Food',
    note: '',
    occurredAt: overrides.occurredAt ?? '2026-07-26T12:00:00.000Z',
    createdAt: '2026-07-26T12:00:00.000Z',
    updatedAt: '2026-07-26T12:00:00.000Z',
  };
}

describe('money reports', () => {
  it('groups income, spending, and categories without mixing currencies', () => {
    const report = buildMoneyReport(
      [
        entry({id: 'expense_food', amountMinor: 1250}),
        entry({id: 'expense_transport', amountMinor: 500, category: 'Transport'}),
        entry({id: 'income', kind: 'income', amountMinor: 5000, category: 'Income'}),
        entry({id: 'usd', amountMinor: 2500, currency: 'USD'}),
      ],
      getPeriodRange(new Date(2026, 6, 26), 'month'),
    );

    expect(report.currencies).toHaveLength(2);
    expect(report.currencies[0]).toMatchObject({currency: 'EUR', incomeMinor: 5000, expenseMinor: 1750});
    expect(report.currencies[0].categories).toEqual([
      {name: 'Food', expenseMinor: 1250, incomeMinor: 0},
      {name: 'Transport', expenseMinor: 500, incomeMinor: 0},
      {name: 'Income', expenseMinor: 0, incomeMinor: 5000},
    ]);
    expect(report.currencies[1]).toMatchObject({currency: 'USD', incomeMinor: 0, expenseMinor: 2500});
  });

  it('does not include entries outside the selected range', () => {
    const report = buildMoneyReport(
      [
        entry({id: 'inside', amountMinor: 100}),
        entry({id: 'outside', amountMinor: 900, occurredAt: '2026-06-30T12:00:00.000Z'}),
      ],
      getPeriodRange(new Date(2026, 6, 26), 'month'),
    );

    expect(report.currencies[0].expenseMinor).toBe(100);
  });
});
