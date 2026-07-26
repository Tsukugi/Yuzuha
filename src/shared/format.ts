import type {MoneyEntry} from '../types/domain';

export function sumMoney(entries: MoneyEntry[], kind: MoneyEntry['kind']): number {
  return entries
    .filter(entry => entry.kind === kind)
    .reduce((total, entry) => total + entry.amountMinor, 0);
}

export function formatMoney(amountMinor: number, currency = 'EUR'): string {
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);
  return `${sign}${currency} ${(absolute / 100).toFixed(2)}`;
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}
