import {getLocalDateKeys, isInPeriod, localDateKey, type PeriodRange} from './period';
import type {MoneyEntry, MoneyKind, MoneySplit} from '../types/domain';

export interface MoneyChartFilter {
  kind: MoneyKind | 'all';
  categoryId: string | 'all';
  accountId: string | 'all';
}

export interface MoneyCategoryChartPoint {
  name: string;
  expenseMinor: number;
  incomeMinor: number;
}

export interface MoneyDailyChartPoint {
  localDate: string;
  expenseMinor: number;
  incomeMinor: number;
}

export interface MoneyChartData {
  categories: MoneyCategoryChartPoint[];
  daily: MoneyDailyChartPoint[];
}

export function buildMoneyChartData(
  entries: MoneyEntry[],
  splits: MoneySplit[],
  range: PeriodRange | null,
  currency: string,
  filter: MoneyChartFilter,
  categoryLimit = 5,
): MoneyChartData {
  const categories = new Map<string, MoneyCategoryChartPoint>();
  const daily = new Map<string, MoneyDailyChartPoint>();
  const splitByParent = new Map(splits.map(split => [split.parentEntryId, split]));

  if (range !== null) {
    for (const localDate of getLocalDateKeys(range)) {
      daily.set(localDate, {localDate, expenseMinor: 0, incomeMinor: 0});
    }
  }

  for (const entry of entries) {
    if (entry.currency !== currency || (range !== null && !isInPeriod(entry.occurredAt, range))) {
      continue;
    }
    if (filter.kind !== 'all' && entry.kind !== filter.kind) {
      continue;
    }
    if (filter.accountId !== 'all' && entry.accountId !== filter.accountId) {
      continue;
    }

    const split = splitByParent.get(entry.id);
    const lines = split?.lines ?? [{categoryId: entry.categoryId, category: entry.category, amountMinor: entry.amountMinor}];
    const selectedLines = lines.filter(line => filter.categoryId === 'all' || line.categoryId === filter.categoryId);
    if (selectedLines.length === 0) {
      continue;
    }

    const amountMinor = selectedLines.reduce((total, line) => total + line.amountMinor, 0);
    const currentDay = daily.get(localDateKey(new Date(entry.occurredAt)));
    if (currentDay) {
      currentDay[entry.kind === 'expense' ? 'expenseMinor' : 'incomeMinor'] += amountMinor;
    }

    for (const line of selectedLines) {
      const category = categories.get(line.category) ?? {name: line.category, expenseMinor: 0, incomeMinor: 0};
      category[entry.kind === 'expense' ? 'expenseMinor' : 'incomeMinor'] += line.amountMinor;
      categories.set(line.category, category);
    }
  }

  const sortedCategories = [...categories.values()].sort((left, right) => {
    return right.expenseMinor - left.expenseMinor
      || right.incomeMinor - left.incomeMinor
      || left.name.localeCompare(right.name);
  });
  const visibleCategories = sortedCategories.slice(0, categoryLimit);
  const other = sortedCategories.slice(categoryLimit).reduce(
    (total, category) => ({
      name: 'Other',
      expenseMinor: total.expenseMinor + category.expenseMinor,
      incomeMinor: total.incomeMinor + category.incomeMinor,
    }),
    {name: 'Other', expenseMinor: 0, incomeMinor: 0},
  );
  if (other.expenseMinor > 0 || other.incomeMinor > 0) {
    visibleCategories.push(other);
  }

  return {categories: visibleCategories, daily: [...daily.values()]};
}
