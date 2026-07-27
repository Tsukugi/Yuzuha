import type {AppData, MissedOccurrencePolicy, RecurrenceCadence, Task, TaskPriority, TaskRecurrenceRule} from '../types/domain';
import {addRecurrenceDate, isValidLocalDate} from './moneyRecurrence';
import {parseTaskReminderLocalDateTime} from './taskReminder';

export interface TaskRecurrenceDraft {
  title: string;
  details: string;
  priority: TaskPriority;
  listId: string;
  cadence: RecurrenceCadence;
  interval: number;
  nextOccurrenceLocalDate: string;
  missedOccurrencePolicy: MissedOccurrencePolicy;
  reminderLocalTime: string | null;
}

export interface TaskRecurrenceExpansion {
  data: AppData;
  generatedCount: number;
}

export function isValidTaskRecurrenceReminderLocalTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(3, 5));
  return hour <= 23 && minute <= 59;
}

export function validateTaskRecurrenceDraft(input: TaskRecurrenceDraft, listIds: ReadonlySet<string>): string | null {
  if (typeof input.title !== 'string' || !input.title.trim()) {
    return 'Recurring task title is required.';
  }
  if (typeof input.details !== 'string') {
    return 'Recurring task details are invalid.';
  }
  if (input.priority !== 'low' && input.priority !== 'normal' && input.priority !== 'high') {
    return 'Choose a valid recurring task priority.';
  }
  if (!listIds.has(input.listId)) {
    return 'Choose a valid task list for the recurring task.';
  }
  if (input.cadence !== 'day' && input.cadence !== 'week' && input.cadence !== 'month') {
    return 'Choose a valid recurring task cadence.';
  }
  if (!Number.isSafeInteger(input.interval) || input.interval < 1 || input.interval > 365) {
    return 'Recurring task interval must be a whole number from 1 to 365.';
  }
  if (!isValidLocalDate(input.nextOccurrenceLocalDate)) {
    return 'Enter a valid recurring task date as YYYY-MM-DD.';
  }
  if (input.reminderLocalTime !== null &&
      (!isValidTaskRecurrenceReminderLocalTime(input.reminderLocalTime) || input.reminderLocalTime !== input.reminderLocalTime.trim())) {
    return 'Use HH:mm for the recurring reminder time.';
  }
  if (input.missedOccurrencePolicy !== 'all' && input.missedOccurrencePolicy !== 'one' && input.missedOccurrencePolicy !== 'skip') {
    return 'Choose a valid missed-occurrence policy for the recurring task.';
  }
  return null;
}

export function createTaskRecurrenceRecord(input: TaskRecurrenceDraft, id: string, timestamp: string): TaskRecurrenceRule {
  const validationError = validateTaskRecurrenceDraft(input, new Set([input.listId]));
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    id,
    title: input.title.trim(),
    details: input.details.trim(),
    priority: input.priority,
    listId: input.listId,
    cadence: input.cadence,
    interval: input.interval,
    nextOccurrenceLocalDate: input.nextOccurrenceLocalDate,
    missedOccurrencePolicy: input.missedOccurrencePolicy,
    reminderLocalTime: input.reminderLocalTime,
    isPaused: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function expandDueTaskRecurrences(data: AppData, todayLocalDate: string, generatedAt = new Date().toISOString()): TaskRecurrenceExpansion {
  if (!isValidLocalDate(todayLocalDate)) {
    throw new Error('Recurring task expansion requires a valid local date.');
  }
  const generatedTasks: Task[] = [];
  const recurrences = data.taskRecurrences.map(rule => {
    if (rule.isPaused || rule.nextOccurrenceLocalDate > todayLocalDate) {
      return rule;
    }
    const dueDates: string[] = [];
    let nextOccurrenceLocalDate = rule.nextOccurrenceLocalDate;
    while (nextOccurrenceLocalDate <= todayLocalDate) {
      dueDates.push(nextOccurrenceLocalDate);
      nextOccurrenceLocalDate = addRecurrenceDate(nextOccurrenceLocalDate, rule.cadence, rule.interval);
    }
    const occurrenceDates = rule.missedOccurrencePolicy === 'all'
      ? dueDates
      : rule.missedOccurrencePolicy === 'one'
        ? dueDates.slice(0, 1)
        : rule.missedOccurrencePolicy === 'skip'
          ? []
          : (() => { throw new Error(`Recurring task rule ${rule.id} has an invalid missed-occurrence policy.`); })();
    occurrenceDates.forEach(occurrenceLocalDate => {
      const taskId = `task_${rule.id}_${occurrenceLocalDate}`;
      if (!data.tasks.some(task => task.id === taskId) && !generatedTasks.some(task => task.id === taskId)) {
        const reminderAtMillis = rule.reminderLocalTime === null
          ? null
          : parseTaskReminderLocalDateTime(`${occurrenceLocalDate}T${rule.reminderLocalTime}`);
        generatedTasks.push({
          id: taskId,
          title: rule.title,
          details: rule.details,
          status: 'open',
          dueLocalDate: occurrenceLocalDate,
          priority: rule.priority,
          listId: rule.listId,
          sourceNoteId: null,
          recurrenceRuleId: rule.id,
          reminderAtMillis,
          createdAt: generatedAt,
          updatedAt: generatedAt,
        });
      }
    });
    return {...rule, nextOccurrenceLocalDate, updatedAt: generatedAt};
  });

  const changed = generatedTasks.length > 0 || recurrences.some((rule, index) => rule !== data.taskRecurrences[index]);
  return {
    data: changed ? {...data, taskRecurrences: recurrences, tasks: [...generatedTasks.reverse(), ...data.tasks]} : data,
    generatedCount: generatedTasks.length,
  };
}

export function setTaskRecurrencePaused(rules: TaskRecurrenceRule[], ruleId: string, isPaused: boolean, timestamp = new Date().toISOString()): TaskRecurrenceRule[] {
  if (!rules.some(rule => rule.id === ruleId)) {
    throw new Error('The recurring task rule no longer exists.');
  }
  return rules.map(rule => rule.id === ruleId ? {...rule, isPaused, updatedAt: timestamp} : rule);
}

export function deleteTaskRecurrenceRecord(rules: TaskRecurrenceRule[], tasks: Task[], ruleId: string, timestamp = new Date().toISOString()): {taskRecurrences: TaskRecurrenceRule[]; tasks: Task[]} {
  if (!rules.some(rule => rule.id === ruleId)) {
    throw new Error('The recurring task rule no longer exists.');
  }
  return {
    taskRecurrences: rules.filter(rule => rule.id !== ruleId),
    tasks: tasks.map(task => task.recurrenceRuleId === ruleId ? {...task, recurrenceRuleId: null, updatedAt: timestamp} : task),
  };
}
