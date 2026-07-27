export type Period = 'day' | 'week' | 'month';
export type WeekStartDay = 0 | 1;

export interface PeriodRange {
  start: Date;
  end: Date;
}

export function periodLabel(period: Period): string {
  if (period === 'week') {
    return 'This week';
  }
  if (period === 'month') {
    return 'This month';
  }
  return 'Today';
}

export function formatPeriodRange(range: PeriodRange): string {
  const endDate = new Date(range.end.getTime() - 1);
  return `${localDateKey(range.start)} to ${localDateKey(endDate)}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getPeriodRange(now: Date, period: Period, weekStartsOn: WeekStartDay = 1): PeriodRange {
  const start = startOfDay(now);
  if (period === 'day') {
    return {start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)};
  }
  if (period === 'month') {
    return {
      start: new Date(start.getFullYear(), start.getMonth(), 1),
      end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
    };
  }

  const weekStartOffset = (start.getDay() - weekStartsOn + 7) % 7;
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() - weekStartOffset);
  return {
    start: weekStart,
    end: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7),
  };
}

export function isInPeriod(isoDate: string, range: PeriodRange): boolean {
  const time = new Date(isoDate).getTime();
  return time >= range.start.getTime() && time < range.end.getTime();
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateKeys(range: PeriodRange): Set<string> {
  const keys = new Set<string>();
  const cursor = new Date(range.start);
  while (cursor < range.end) {
    keys.add(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
