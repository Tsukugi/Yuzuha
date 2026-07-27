import {getPeriodRange, isInPeriod, type Period} from './period';
import type {MoneyEntry} from '../types/domain';

export type MoneyFilterPeriod = 'all' | Period;

export interface MoneyEntryFilter {
  period: MoneyFilterPeriod;
  kind: MoneyEntry['kind'] | 'all';
  categoryId: string | 'all';
  accountId: string | 'all';
}

export interface MoneyEntryTotal {
  currency: string;
  count: number;
  expenseMinor: number;
  incomeMinor: number;
}

export const emptyMoneyEntryFilter: MoneyEntryFilter = {
  period: 'all',
  kind: 'all',
  categoryId: 'all',
  accountId: 'all',
};

export function filterMoneyEntries(entries: MoneyEntry[], filter: MoneyEntryFilter, now = new Date()): MoneyEntry[] {
  const range = filter.period === 'all' ? null : getPeriodRange(now, filter.period);
  return entries.filter(entry => (
    (range === null || isInPeriod(entry.occurredAt, range)) &&
    (filter.kind === 'all' || entry.kind === filter.kind) &&
    (filter.categoryId === 'all' || entry.categoryId === filter.categoryId) &&
    (filter.accountId === 'all' || entry.accountId === filter.accountId)
  ));
}

export function summarizeFilteredMoneyEntries(
  entries: MoneyEntry[],
  filter: MoneyEntryFilter,
  now = new Date(),
): MoneyEntryTotal[] {
  return summarizeMoneyEntries(filterMoneyEntries(entries, filter, now));
}

export function summarizeMoneyEntries(entries: MoneyEntry[]): MoneyEntryTotal[] {
  const totals = new Map<string, MoneyEntryTotal>();
  for (const entry of entries) {
    const total = totals.get(entry.currency) ?? {
      currency: entry.currency,
      count: 0,
      expenseMinor: 0,
      incomeMinor: 0,
    };
    total.count += 1;
    total[entry.kind === 'income' ? 'incomeMinor' : 'expenseMinor'] += entry.amountMinor;
    totals.set(entry.currency, total);
  }
  return [...totals.values()];
}
