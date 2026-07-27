import {buildBudgetProjection, validateMoneyBudget} from './moneyBudget';
import type {MoneyBudget, MoneyCategory, MoneyEntry, MoneySplit} from '../types/domain';

const categories: MoneyCategory[] = [
  {id: 'category_food', name: 'Food', kind: 'expense', isArchived: false},
  {id: 'category_income', name: 'Income', kind: 'income', isArchived: false},
];

const budget: MoneyBudget = {
  id: 'budget_food',
  categoryId: 'category_food',
  category: 'Food',
  amountMinor: 2000,
  currency: 'EUR',
  period: 'month',
  rollover: 'none',
  isArchived: false,
  createdAt: '2026-07-26T12:00:00.000Z',
  updatedAt: '2026-07-26T12:00:00.000Z',
};

const entry = (overrides: Partial<MoneyEntry>): MoneyEntry => ({
  id: overrides.id ?? 'money_1',
  kind: overrides.kind ?? 'expense',
  amountMinor: overrides.amountMinor ?? 100,
  currency: overrides.currency ?? 'EUR',
  accountId: 'account_everyday',
  categoryId: overrides.categoryId ?? 'category_food',
  payeeId: null,
  category: overrides.category ?? 'Food',
  note: '',
  occurredAt: overrides.occurredAt ?? '2026-07-26T12:00:00.000Z',
  createdAt: '2026-07-26T12:00:00.000Z',
  updatedAt: '2026-07-26T12:00:00.000Z',
  splitId: overrides.splitId,
});

describe('money budgets', () => {
  it('validates a positive amount, valid currency, period, and expense category', () => {
    expect(validateMoneyBudget(budget, categories)).toBeNull();
    expect(validateMoneyBudget({...budget, amountMinor: 0}, categories)).toContain('positive');
    expect(validateMoneyBudget({...budget, currency: 'eu'}, categories)).toContain('uppercase');
    expect(validateMoneyBudget({...budget, categoryId: 'category_income'}, categories)).toContain('expense category');
  });

  it('projects regular and split expenses without counting income or other currencies', () => {
    const splitEntry = entry({id: 'split_parent', amountMinor: 1000, categoryId: null, category: 'Split', splitId: 'split_1'});
    const split: MoneySplit = {
      id: 'split_1',
      parentEntryId: splitEntry.id,
      lines: [
        {id: 'line_food', categoryId: 'category_food', category: 'Food', amountMinor: 600, note: ''},
        {id: 'line_other', categoryId: 'category_other', category: 'Other', amountMinor: 400, note: ''},
      ],
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    };
    const projection = buildBudgetProjection(
      budget,
      [
        entry({id: 'regular', amountMinor: 500}),
        splitEntry,
        entry({id: 'income', kind: 'income', amountMinor: 900}),
        entry({id: 'usd', amountMinor: 900, currency: 'USD'}),
        entry({id: 'old', amountMinor: 900, occurredAt: '2026-06-30T12:00:00.000Z'}),
      ],
      [split],
      new Date(2026, 6, 26),
    );

    expect(projection.usedMinor).toBe(1100);
    expect(projection.remainingMinor).toBe(900);
    expect(projection.percentUsed).toBe(55);
    expect(projection.effectiveLimitMinor).toBe(2000);
    expect(projection.rolloverMinor).toBe(0);
    expect(projection.status).toBe('on-track');
  });

  it('carries only an unused positive balance from the previous period', () => {
    const projection = buildBudgetProjection(
      {...budget, amountMinor: 2000, rollover: 'carry-forward'},
      [
        entry({id: 'previous', amountMinor: 500, occurredAt: '2026-06-26T12:00:00.000Z'}),
        entry({id: 'current', amountMinor: 1000}),
      ],
      [],
      new Date(2026, 6, 26),
    );

    expect(projection.rolloverMinor).toBe(1500);
    expect(projection.effectiveLimitMinor).toBe(3500);
    expect(projection.remainingMinor).toBe(2500);
    expect(projection.percentUsed).toBe(29);
  });

  it('marks near-limit and over-budget projections', () => {
    expect(buildBudgetProjection({...budget, amountMinor: 1000}, [entry({amountMinor: 800})], [], new Date(2026, 6, 26)).status).toBe(
      'near-limit',
    );
    expect(buildBudgetProjection({...budget, amountMinor: 1000}, [entry({amountMinor: 1001})], [], new Date(2026, 6, 26)).status).toBe(
      'over',
    );
  });

  it('uses the configured week start for weekly budgets', () => {
    const projection = buildBudgetProjection(
      {...budget, period: 'week'},
      [
        entry({id: 'sunday', amountMinor: 500, occurredAt: '2026-07-26T12:00:00.000Z'}),
        entry({id: 'monday', amountMinor: 700, occurredAt: '2026-07-27T12:00:00.000Z'}),
      ],
      [],
      new Date(2026, 6, 28),
      0,
    );

    expect(projection.start).toEqual(new Date(2026, 6, 26));
    expect(projection.usedMinor).toBe(1200);
  });
});
