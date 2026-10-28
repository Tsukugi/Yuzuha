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

const padDatePart = (value: number): string => String(value).padStart(2, '0');

export function formatLocalDate(localDate: string, referenceDate = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) {
    return localDate;
  }
  const year = Number(match[1]);
  return year === referenceDate.getFullYear() ? `${match[3]}.${match[2]}` : `${match[3]}.${match[2]}.${match[1]}`;
}

export function formatLocalDateTime(localDateTime: string, referenceDate = new Date()): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(localDateTime);
  return match ? `${formatLocalDate(match[1], referenceDate)}, ${match[2]}` : localDateTime;
}

export function formatDate(isoDate: string, referenceDate = new Date()): string {
  const date = new Date(isoDate);
  const localDate = `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
  return formatLocalDate(localDate, referenceDate);
}

export function formatDateTime(isoDate: string, referenceDate = new Date()): string {
  const date = new Date(isoDate);
  return `${formatDate(isoDate, referenceDate)}, ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}
