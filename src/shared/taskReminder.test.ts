import {
  formatTaskReminderLocalDateTime,
  parseTaskReminderLocalDateTime,
  validateTaskReminderDraft,
} from './taskReminder';

describe('task reminders', () => {
  const now = new Date(2026, 6, 27, 12, 0, 0, 0).getTime();

  it('accepts a future local date-time and round-trips it', () => {
    const input = '2026-07-28T09:30';

    expect(validateTaskReminderDraft(input, now)).toBeNull();
    const timestamp = parseTaskReminderLocalDateTime(input);
    expect(timestamp).not.toBeNull();
    expect(timestamp).toBeGreaterThan(now);
    expect(formatTaskReminderLocalDateTime(timestamp as number)).toBe(input);
  });

  it('rejects malformed, impossible, and past local date-times', () => {
    expect(validateTaskReminderDraft('', now)).toMatch(/date and time/i);
    expect(validateTaskReminderDraft('2026-02-30T09:30', now)).toMatch(/valid/i);
    expect(validateTaskReminderDraft('2026-07-28 09:30', now)).toMatch(/format/i);
    expect(validateTaskReminderDraft('2026-07-28T25:00', now)).toMatch(/valid/i);
    expect(validateTaskReminderDraft('2026-07-27T11:59', now)).toMatch(/future/i);
  });
});
