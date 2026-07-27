import {getPeriodRange, isInPeriod, type Period} from './period';
import type {MoneyEntry} from '../types/domain';

export type MoneyFilterPeriod = 'all' | Period;

export interface MoneyEntryFilter {
  period: MoneyFilterPeriod;
  kind: MoneyEntry['kind'] | 'all';
  categoryId: string | 'all';
  accountId: string | 'all';
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
