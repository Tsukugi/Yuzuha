import {localDateKey, type PeriodRange} from './period';
import type {UsageSnapshot} from '../types/domain';

export interface UsageRecord {
  packageName: string;
  displayName: string;
  durationSeconds: number;
  beginTimeMillis: number;
}

export function getLocalDayRanges(range: PeriodRange): PeriodRange[] {
  const ranges: PeriodRange[] = [];
  let cursor = new Date(range.start);
  while (cursor < range.end) {
    const start = new Date(cursor);
    const nextDay = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    ranges.push({start, end: nextDay < range.end ? nextDay : range.end});
    cursor = nextDay;
  }
  return ranges;
}

export function aggregateUsagePeriod(
  dailyRecords: Array<{records: UsageRecord[]; rangeStartMillis: number}>,
  sourceReadAt: string,
): UsageSnapshot[] {
  return dailyRecords.flatMap(({records, rangeStartMillis}) =>
    aggregateUsage(assignUsageRangeDate(records, rangeStartMillis), sourceReadAt),
  );
}

export function assignUsageRangeDate(records: UsageRecord[], rangeStartMillis: number): UsageRecord[] {
  return records.map(record => ({...record, beginTimeMillis: rangeStartMillis}));
}

export function aggregateUsage(records: UsageRecord[], sourceReadAt: string): UsageSnapshot[] {
  const grouped = new Map<string, UsageSnapshot>();
  for (const record of records) {
    if (record.durationSeconds <= 0) {
      continue;
    }
    const localDate = localDateKey(new Date(record.beginTimeMillis));
    const id = `usage_${record.packageName}_${localDate}`;
    const current = grouped.get(id);
    grouped.set(id, {
      id,
      packageName: record.packageName,
      displayName: record.displayName || record.packageName,
      localDate,
      durationSeconds: (current?.durationSeconds ?? 0) + Math.round(record.durationSeconds),
      sourceReadAt,
      included: current?.included ?? true,
    });
  }
  return [...grouped.values()].sort((left, right) => right.durationSeconds - left.durationSeconds);
}

export function sumUsage(snapshots: UsageSnapshot[], localDates: Set<string>): number {
  return snapshots
    .filter(snapshot => snapshot.included && localDates.has(snapshot.localDate))
    .reduce((total, snapshot) => total + snapshot.durationSeconds, 0);
}
