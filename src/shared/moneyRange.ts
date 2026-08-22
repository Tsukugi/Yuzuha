import {getPeriodRange, isInPeriod, type WeekStartDay} from './period';
import {isValidLocalDate} from './moneyRecurrence';

export type MoneyRangePeriod = 'all' | 'day' | 'week' | 'month' | 'year' | 'custom';

/** Both dates are local calendar boundaries; the end boundary is exclusive. */
export interface MoneyCustomInterval {
  startLocalDate: string;
  endLocalDate: string;
}

export type MoneyRangeSelection =
  | {period: Exclude<MoneyRangePeriod, 'custom'>}
  | ({period: 'custom'} & MoneyCustomInterval);

export interface MoneyRange {
  start: Date;
  end: Date;
}

export function getMoneyRange(
  now: Date,
  selection: MoneyRangeSelection,
  weekStartsOn: WeekStartDay = 1,
): MoneyRange | null {
  if (selection.period === 'all') {
    return null;
  }
  if (selection.period === 'custom') {
    return getCustomMoneyRange(selection);
  }
  if (selection.period === 'year') {
    const year = now.getFullYear();
    return {
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
    };
  }
  return getPeriodRange(now, selection.period, weekStartsOn);
}

export function isInMoneyRange(occurredAt: string, range: MoneyRange | null): boolean {
  return range === null || isInPeriod(occurredAt, range);
}

function getCustomMoneyRange(selection: {period: 'custom'} & MoneyCustomInterval): MoneyRange {
  const start = localDateStart(selection.startLocalDate);
  const end = localDateStart(selection.endLocalDate);
  if (end.getTime() < start.getTime()) {
    throw new RangeError('A custom money interval must end on or after its start date.');
  }
  return {start, end};
}

function localDateStart(localDate: string): Date {
  if (!isValidLocalDate(localDate)) {
    throw new RangeError('Money interval dates must use a valid YYYY-MM-DD local date.');
  }
  const [year, month, day] = localDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}
