export type Period = 'day' | 'week' | 'month';

export interface PeriodRange {
  start: Date;
  end: Date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getPeriodRange(now: Date, period: Period): PeriodRange {
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

  const mondayOffset = (start.getDay() + 6) % 7;
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() - mondayOffset);
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
