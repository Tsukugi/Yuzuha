import type {NotificationSettings, TaskReminderSnoozeDurationMinutes} from '../types/domain';

export const TASK_REMINDER_SNOOZE_DURATION_OPTIONS: readonly TaskReminderSnoozeDurationMinutes[] = [15, 30, 60, 120];
export const DEFAULT_TASK_REMINDER_SNOOZE_DURATION_MINUTES: TaskReminderSnoozeDurationMinutes = 60;

export function isValidTaskReminderSnoozeDuration(value: unknown): value is TaskReminderSnoozeDurationMinutes {
  return TASK_REMINDER_SNOOZE_DURATION_OPTIONS.some(option => option === value);
}

export function parseLocalTime(input: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(input);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    return null;
  }
  return hour * 60 + minute;
}

export function validateQuietHoursDraft(startInput: string, endInput: string): string | null {
  const start = startInput.trim();
  const end = endInput.trim();
  if (!start && !end) {
    return null;
  }
  if (!start || !end) {
    return 'Enter both quiet-hours times, or leave both empty.';
  }
  const startMinutes = parseLocalTime(start);
  const endMinutes = parseLocalTime(end);
  if (startMinutes === null || endMinutes === null) {
    return 'Use HH:mm for quiet-hours times.';
  }
  if (startMinutes === endMinutes) {
    return 'Quiet-hours start and end must be different.';
  }
  return null;
}

export function adjustTaskReminderForQuietHours(timestamp: number, settings: NotificationSettings): number {
  const start = settings.quietHoursStartLocalTime === null ? null : parseLocalTime(settings.quietHoursStartLocalTime);
  const end = settings.quietHoursEndLocalTime === null ? null : parseLocalTime(settings.quietHoursEndLocalTime);
  if (start === null || end === null || start === end) {
    return timestamp;
  }

  const date = new Date(timestamp);
  const localMinutes = date.getHours() * 60 + date.getMinutes();
  const overnight = start > end;
  const isQuiet = overnight ? localMinutes >= start || localMinutes < end : localMinutes >= start && localMinutes < end;
  if (!isQuiet) {
    return timestamp;
  }

  const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(end / 60), end % 60, 0, 0);
  if (overnight && localMinutes >= start) {
    endDate.setDate(endDate.getDate() + 1);
  }
  if (endDate.getTime() <= timestamp) {
    endDate.setDate(endDate.getDate() + 1);
  }
  return endDate.getTime();
}
