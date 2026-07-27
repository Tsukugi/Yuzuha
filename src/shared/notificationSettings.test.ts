import {adjustTaskReminderForQuietHours, isValidTaskReminderSnoozeDuration, TASK_REMINDER_SNOOZE_DURATION_OPTIONS, validateQuietHoursDraft} from './notificationSettings';

describe('notification settings', () => {
  it('accepts only the supported snooze durations', () => {
    expect(TASK_REMINDER_SNOOZE_DURATION_OPTIONS).toEqual([15, 30, 60, 120]);
    expect(isValidTaskReminderSnoozeDuration(30)).toBe(true);
    expect(isValidTaskReminderSnoozeDuration(45)).toBe(false);
  });

  it('accepts an all-day local time pair only when it defines a window', () => {
    expect(validateQuietHoursDraft('', '')).toBeNull();
    expect(validateQuietHoursDraft('22:00', '07:00')).toBeNull();
    expect(validateQuietHoursDraft('07:00', '22:00')).toBeNull();
    expect(validateQuietHoursDraft('07:00', '07:00')).toMatch(/different/i);
  });

  it('rejects malformed or partial local time pairs', () => {
    expect(validateQuietHoursDraft('7:00', '22:00')).toMatch(/HH:mm/i);
    expect(validateQuietHoursDraft('07:00', '24:00')).toMatch(/HH:mm/i);
    expect(validateQuietHoursDraft('07:00', '')).toMatch(/both/i);
  });

  it('moves reminders inside a same-day quiet window to its end', () => {
    const reminder = new Date(2026, 6, 27, 21, 30).getTime();
    const quietReminder = new Date(2026, 6, 27, 22, 30).getTime();

    expect(adjustTaskReminderForQuietHours(reminder, {quietHoursStartLocalTime: '22:00', quietHoursEndLocalTime: '23:00', snoozeDurationMinutes: 60, taskRemindersEnabled: true})).toBe(reminder);
    expect(adjustTaskReminderForQuietHours(quietReminder, {quietHoursStartLocalTime: '22:00', quietHoursEndLocalTime: '23:00', snoozeDurationMinutes: 60, taskRemindersEnabled: true})).toBe(new Date(2026, 6, 27, 23, 0).getTime());
  });

  it('moves overnight reminders to the correct local next end', () => {
    const lateReminder = new Date(2026, 6, 27, 23, 30).getTime();
    const earlyReminder = new Date(2026, 6, 28, 1, 30).getTime();

    expect(adjustTaskReminderForQuietHours(lateReminder, {quietHoursStartLocalTime: '22:00', quietHoursEndLocalTime: '07:00', snoozeDurationMinutes: 60, taskRemindersEnabled: true})).toBe(new Date(2026, 6, 28, 7, 0).getTime());
    expect(adjustTaskReminderForQuietHours(earlyReminder, {quietHoursStartLocalTime: '22:00', quietHoursEndLocalTime: '07:00', snoozeDurationMinutes: 60, taskRemindersEnabled: true})).toBe(new Date(2026, 6, 28, 7, 0).getTime());
  });
});
