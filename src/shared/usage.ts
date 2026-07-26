import {localDateKey} from './period';
import type {UsageSnapshot} from '../types/domain';

export interface UsageRecord {
  packageName: string;
  displayName: string;
  durationSeconds: number;
  beginTimeMillis: number;
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
