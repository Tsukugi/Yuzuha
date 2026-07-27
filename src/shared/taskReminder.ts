export const TASK_REMINDER_SNOOZE_DELAY_MILLIS = 60 * 60 * 1000;

export function parseTaskReminderLocalDateTime(input: string): number | null {
  if (typeof input !== 'string') {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const timestamp = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (timestamp.getFullYear() !== year || timestamp.getMonth() !== month - 1 || timestamp.getDate() !== day ||
      timestamp.getHours() !== hour || timestamp.getMinutes() !== minute) {
    return null;
  }
  return timestamp.getTime();
}

export function formatTaskReminderLocalDateTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    throw new Error('Task reminder time is invalid.');
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Task reminder time is invalid.');
  }
  return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function validateTaskReminderDraft(input: string, nowMillis = Date.now()): string | null {
  if (typeof input !== 'string' || !input.trim()) {
    return 'Enter a reminder date and time.';
  }
  if (input !== input.trim() || parseTaskReminderLocalDateTime(input) === null) {
    return 'Enter a valid reminder date and time in YYYY-MM-DDTHH:mm format.';
  }
  const timestamp = parseTaskReminderLocalDateTime(input);
  if (timestamp === null || timestamp <= nowMillis) {
    return 'The reminder time must be in the future.';
  }
  return null;
}

export function validateTaskReminderTimestamp(timestamp: number, nowMillis = Date.now()): string | null {
  if (!Number.isSafeInteger(timestamp) || timestamp <= nowMillis) {
    return 'The reminder time must be in the future.';
  }
  return null;
}
