import {emptyAppData} from '../types/domain';
import {
  createTaskRecurrenceRecord,
  expandDueTaskRecurrences,
  validateTaskRecurrenceDraft,
} from './taskRecurrence';

describe('task recurrence rules', () => {
  const valid = {
    title: 'Review weekly plan',
    details: 'Keep the list current.',
    priority: 'normal' as const,
    listId: 'task_list_inbox',
    cadence: 'week' as const,
    interval: 1,
    nextOccurrenceLocalDate: '2026-07-20',
    missedOccurrencePolicy: 'all' as const,
    reminderLocalTime: null,
  };

  it('validates and creates a date-based rule', () => {
    expect(validateTaskRecurrenceDraft(valid, new Set(['task_list_inbox']))).toBeNull();
    expect(createTaskRecurrenceRecord(valid, 'task_recurrence_weekly', '2026-07-27T12:00:00.000Z')).toEqual({
      id: 'task_recurrence_weekly',
      title: 'Review weekly plan',
      details: 'Keep the list current.',
      priority: 'normal',
      listId: 'task_list_inbox',
      cadence: 'week',
      interval: 1,
      nextOccurrenceLocalDate: '2026-07-20',
      missedOccurrencePolicy: 'all',
      reminderLocalTime: null,
      isPaused: false,
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    });
  });

  it('rejects invalid dates, intervals, policies, priorities, and lists', () => {
    expect(validateTaskRecurrenceDraft({...valid, title: ' '}, new Set(['task_list_inbox']))).toMatch(/title/i);
    expect(validateTaskRecurrenceDraft({...valid, nextOccurrenceLocalDate: '2026-02-30'}, new Set(['task_list_inbox']))).toMatch(/date/i);
    expect(validateTaskRecurrenceDraft({...valid, interval: 0}, new Set(['task_list_inbox']))).toMatch(/interval/i);
    expect(validateTaskRecurrenceDraft({...valid, missedOccurrencePolicy: 'later' as never}, new Set(['task_list_inbox']))).toMatch(/missed/i);
    expect(validateTaskRecurrenceDraft({...valid, priority: 'urgent' as never}, new Set(['task_list_inbox']))).toMatch(/priority/i);
    expect(validateTaskRecurrenceDraft({...valid, listId: 'missing'}, new Set(['task_list_inbox']))).toMatch(/list/i);
    expect(validateTaskRecurrenceDraft({...valid, reminderLocalTime: '25:00'}, new Set(['task_list_inbox']))).toMatch(/HH:mm/i);
  });

  it('creates generated reminders at the rule local time', () => {
    const data = emptyAppData();
    data.taskRecurrences = [createTaskRecurrenceRecord({
      ...valid,
      nextOccurrenceLocalDate: '2026-07-27',
      reminderLocalTime: '09:30',
    }, 'rule_reminder', '2026-07-27T08:00:00.000Z')];

    const expanded = expandDueTaskRecurrences(data, '2026-07-27', '2026-07-27T08:00:00.000Z');

    expect(expanded.data.tasks[0]?.reminderAtMillis).toBe(new Date(2026, 6, 27, 9, 30, 0, 0).getTime());
  });

  it('expands all, one, and skip missed occurrences once', () => {
    const data = emptyAppData();
    data.taskRecurrences = [
      createTaskRecurrenceRecord({...valid, nextOccurrenceLocalDate: '2026-07-13', missedOccurrencePolicy: 'all'}, 'rule_all', '2026-07-27T12:00:00.000Z'),
      createTaskRecurrenceRecord({...valid, nextOccurrenceLocalDate: '2026-07-13', missedOccurrencePolicy: 'one'}, 'rule_one', '2026-07-27T12:00:00.000Z'),
      createTaskRecurrenceRecord({...valid, nextOccurrenceLocalDate: '2026-07-13', missedOccurrencePolicy: 'skip'}, 'rule_skip', '2026-07-27T12:00:00.000Z'),
    ];

    const expanded = expandDueTaskRecurrences(data, '2026-07-27', '2026-07-27T13:00:00.000Z');

    expect(expanded.generatedCount).toBe(4);
    expect(expanded.data.tasks.map(task => `${task.recurrenceRuleId}:${task.dueLocalDate}`)).toEqual([
      'rule_one:2026-07-13',
      'rule_all:2026-07-27',
      'rule_all:2026-07-20',
      'rule_all:2026-07-13',
    ]);
    expect(expanded.data.taskRecurrences.map(rule => [rule.id, rule.nextOccurrenceLocalDate])).toEqual([
      ['rule_all', '2026-08-03'],
      ['rule_one', '2026-08-03'],
      ['rule_skip', '2026-08-03'],
    ]);

    const reopened = expandDueTaskRecurrences(expanded.data, '2026-07-27', '2026-07-27T14:00:00.000Z');
    expect(reopened).toMatchObject({generatedCount: 0});
    expect(reopened.data).toBe(expanded.data);
  });
});
