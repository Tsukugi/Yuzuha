import {isValidLocalDate} from './moneyRecurrence';
import type {Task, TaskPriority} from '../types/domain';

export const TASK_INBOX_LIST_ID = 'task_list_inbox';
export const TASK_DEFAULT_PRIORITY: TaskPriority = 'normal';

export interface TaskDraft {
  title: string;
  details: string;
  dueLocalDate: string | null;
  priority: TaskPriority;
  listId: string;
}

export type TaskFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';

export function validateTaskDraft(draft: TaskDraft, listIds: ReadonlySet<string> = new Set([TASK_INBOX_LIST_ID])): string | null {
  if (typeof draft.title !== 'string' || !draft.title.trim()) {
    return 'Task title is required.';
  }
  if (typeof draft.details !== 'string') {
    return 'Task details are invalid.';
  }
  if (draft.dueLocalDate !== null && (typeof draft.dueLocalDate !== 'string' || !isValidLocalDate(draft.dueLocalDate))) {
    return 'Enter a valid due date.';
  }
  if (draft.priority !== 'low' && draft.priority !== 'normal' && draft.priority !== 'high') {
    return 'Choose a valid task priority.';
  }
  if (typeof draft.listId !== 'string' || !listIds.has(draft.listId)) {
    return 'Choose a valid task list.';
  }
  return null;
}

export function createTaskRecord(draft: TaskDraft, id: string, timestamp: string, sourceNoteId: string | null = null): Task {
  const validationError = validateTaskDraft(draft, new Set([draft.listId]));
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    id,
    title: draft.title.trim(),
    details: draft.details.trim(),
    status: 'open',
    dueLocalDate: draft.dueLocalDate,
    priority: draft.priority,
    listId: draft.listId,
    sourceNoteId,
    recurrenceRuleId: null,
    reminderAtMillis: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateTaskRecord(task: Task, draft: TaskDraft, timestamp: string): Task {
  const validationError = validateTaskDraft(draft, new Set([draft.listId]));
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    ...task,
    title: draft.title.trim(),
    details: draft.details.trim(),
    dueLocalDate: draft.dueLocalDate,
    priority: draft.priority,
    listId: draft.listId,
    updatedAt: timestamp,
  };
}

export function deleteTaskRecord(tasks: Task[], taskId: string): Task[] {
  if (!tasks.some(task => task.id === taskId)) {
    throw new Error('The task no longer exists.');
  }
  return tasks.filter(task => task.id !== taskId);
}

export function filterTasks(tasks: Task[], filter: TaskFilter, today: string): Task[] {
  return tasks.filter(task => {
    if (filter === 'all') {
      return true;
    }
    if (filter === 'completed') {
      return task.status === 'completed';
    }
    if (task.status === 'completed') {
      return false;
    }
    if (filter === 'overdue') {
      return task.dueLocalDate !== null && task.dueLocalDate < today;
    }
    if (filter === 'today') {
      return task.dueLocalDate === today;
    }
    if (filter === 'upcoming') {
      return task.dueLocalDate !== null && task.dueLocalDate > today;
    }
    return true;
  });
}
