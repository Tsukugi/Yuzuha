import {getPeriodRange, isInPeriod} from './period';
import type {PeriodRange} from './period';
import type {BudgetPeriod, BudgetRollover, MoneyBudget, MoneyCategory, MoneyEntry, MoneySplit} from '../types/domain';

export interface MoneyBudgetInput {
  categoryId: string;
  category: string;
  amountMinor: number;
  currency: string;
  period: BudgetPeriod;
  rollover: BudgetRollover;
}

export interface BudgetProjection {
  start: Date;
  end: Date;
  usedMinor: number;
  remainingMinor: number;
  percentUsed: number;
  effectiveLimitMinor: number;
  rolloverMinor: number;
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
  if (input.rollover !== 'none' && input.rollover !== 'carry-forward') {
    return 'Choose a valid budget rollover rule.';
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
  const rolloverMinor = budget.rollover === 'carry-forward'
    ? Math.max(0, budget.amountMinor - usedForRange(budget, entries, splits, previousPeriodRange(now, budget.period)))
    : 0;
  const effectiveLimitMinor = budget.amountMinor + rolloverMinor;
  const usedMinor = usedForRange(budget, entries, splits, range);
  const remainingMinor = effectiveLimitMinor - usedMinor;
  const percentUsed = effectiveLimitMinor === 0 ? 0 : Math.round((usedMinor / effectiveLimitMinor) * 100);
  const status = usedMinor === 0 ? 'empty' : remainingMinor < 0 ? 'over' : percentUsed >= 80 ? 'near-limit' : 'on-track';
  return {
    start: range.start,
    end: range.end,
    usedMinor,
    remainingMinor,
    percentUsed,
    effectiveLimitMinor,
    rolloverMinor,
    status,
  };
}

function usedForRange(budget: MoneyBudget, entries: MoneyEntry[], splits: MoneySplit[], range: PeriodRange): number {
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
  return usedMinor;
}

function previousPeriodRange(now: Date, period: BudgetPeriod): PeriodRange {
  if (period === 'month') {
    return getPeriodRange(new Date(now.getFullYear(), now.getMonth() - 1, 1), period);
  }
  const previous = new Date(now);
  previous.setDate(previous.getDate() - (period === 'week' ? 7 : 1));
  return getPeriodRange(previous, period);
}

export function budgetRange(budget: MoneyBudget, now: Date): PeriodRange {
  return getPeriodRange(now, budget.period);
}
