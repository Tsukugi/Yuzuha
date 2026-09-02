import type {MoneyEntry} from '../types/domain';

export function sortMoneyEntriesNewestFirst(entries: readonly MoneyEntry[]): MoneyEntry[] {
  return entries
    .map((entry, index) => ({entry, index, occurredAt: parseOccurredAt(entry.occurredAt)}))
    .sort((left, right) => right.occurredAt - left.occurredAt || left.entry.id.localeCompare(right.entry.id) || left.index - right.index)
    .map(({entry}) => entry);
}

export function compareMoneyEntriesNewestFirst(left: MoneyEntry, right: MoneyEntry): number {
  return parseOccurredAt(right.occurredAt) - parseOccurredAt(left.occurredAt) || left.id.localeCompare(right.id);
}

function parseOccurredAt(occurredAt: string): number {
  const timestamp = Date.parse(occurredAt);
  if (!Number.isFinite(timestamp)) {
    throw new RangeError('Money entries must have valid occurredAt timestamps.');
  }
  return timestamp;
}
