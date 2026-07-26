import {getPeriodRange, isInPeriod} from './period';
import type {PeriodRange} from './period';
import type {BudgetPeriod, MoneyBudget, MoneyCategory, MoneyEntry, MoneySplit} from '../types/domain';

export interface MoneyBudgetInput {
  categoryId: string;
  category: string;
  amountMinor: number;
  currency: string;
  period: BudgetPeriod;
}

export interface BudgetProjection {
  start: Date;
  end: Date;
  usedMinor: number;
  remainingMinor: number;
  percentUsed: number;
  status: 'empty' | 'on-track' | 'near-limit' | 'over';
}

export function validateMoneyBudget(input: MoneyBudgetInput, categories: MoneyCategory[]): string | null {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    return 'Budget amount must be a positive whole number of minor units.';
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    return 'Budget currency must be a three-letter uppercase code.';
  }
  if (input.period !== 'day' && input.period !== 'week' && input.period !== 'month') {
    return 'Choose a valid budget period.';
  }
  const category = categories.find(item => item.id === input.categoryId);
  if (!category || category.isArchived || (category.kind !== 'expense' && category.kind !== 'both')) {
    return 'Choose an active expense category for the budget.';
  }
  return null;
}

export function buildBudgetProjection(
  budget: MoneyBudget,
  entries: MoneyEntry[],
  splits: MoneySplit[],
  now: Date,
): BudgetProjection {
  const range = getPeriodRange(now, budget.period);
  const splitByParent = new Map(splits.map(split => [split.parentEntryId, split]));
  let usedMinor = 0;
  for (const entry of entries) {
    if (entry.kind !== 'expense' || entry.currency !== budget.currency || !isInPeriod(entry.occurredAt, range)) {
      continue;
    }
    const split = splitByParent.get(entry.id);
    if (split) {
      usedMinor += split.lines
        .filter(line => line.categoryId === budget.categoryId)
        .reduce((total, line) => total + line.amountMinor, 0);
    } else if (entry.categoryId === budget.categoryId) {
      usedMinor += entry.amountMinor;
    }
  }
  const remainingMinor = budget.amountMinor - usedMinor;
  const percentUsed = budget.amountMinor === 0 ? 0 : Math.round((usedMinor / budget.amountMinor) * 100);
  const status = usedMinor === 0 ? 'empty' : remainingMinor < 0 ? 'over' : percentUsed >= 80 ? 'near-limit' : 'on-track';
  return {start: range.start, end: range.end, usedMinor, remainingMinor, percentUsed, status};
}

export function budgetRange(budget: MoneyBudget, now: Date): PeriodRange {
  return getPeriodRange(now, budget.period);
}
