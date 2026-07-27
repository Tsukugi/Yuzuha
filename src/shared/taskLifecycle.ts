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
  projectId?: string | null;
}

export type TaskFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'completed';
export type TaskSort = 'manual' | 'due' | 'priority';

export function validateTaskDraft(draft: TaskDraft, listIds: ReadonlySet<string> = new Set([TASK_INBOX_LIST_ID]), projectIds: ReadonlySet<string> = new Set()): string | null {
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
  if (draft.projectId !== undefined && draft.projectId !== null && !projectIds.has(draft.projectId)) {
    return 'Choose a valid project.';
  }
  return null;
}

export function createTaskRecord(draft: TaskDraft, id: string, timestamp: string, sourceNoteId: string | null = null, sortOrder = 0, projectIds: ReadonlySet<string> = draft.projectId ? new Set([draft.projectId]) : new Set()): Task {
  const validationError = validateTaskDraft(draft, new Set([draft.listId]), projectIds);
  if (validationError) {
    throw new Error(validationError);
  }
  if (!Number.isSafeInteger(sortOrder) || sortOrder < 0) {
    throw new Error('Task order is invalid.');
  }
  return {
    id,
    title: draft.title.trim(),
    details: draft.details.trim(),
    status: 'open',
    dueLocalDate: draft.dueLocalDate,
    priority: draft.priority,
    listId: draft.listId,
    sortOrder,
    projectId: draft.projectId ?? null,
    sourceNoteId,
    recurrenceRuleId: null,
    reminderAtMillis: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateTaskRecord(task: Task, draft: TaskDraft, timestamp: string, projectIds: ReadonlySet<string> = draft.projectId ? new Set([draft.projectId]) : new Set()): Task {
  const validationError = validateTaskDraft(draft, new Set([draft.listId]), projectIds);
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
    projectId: draft.projectId ?? null,
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

const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {high: 0, normal: 1, low: 2};

export function sortTasks(tasks: readonly Task[], sort: TaskSort): Task[] {
  if (sort !== 'manual' && sort !== 'due' && sort !== 'priority') {
    throw new Error('Task sort is invalid.');
  }
  return tasks
    .map((task, index) => ({task, index}))
    .sort((left, right) => {
      const leftTask = left.task;
      const rightTask = right.task;
      if (sort === 'due') {
        if (leftTask.dueLocalDate === null && rightTask.dueLocalDate !== null) {
          return 1;
        }
        if (leftTask.dueLocalDate !== null && rightTask.dueLocalDate === null) {
          return -1;
        }
        if (leftTask.dueLocalDate !== rightTask.dueLocalDate) {
          return (leftTask.dueLocalDate ?? '').localeCompare(rightTask.dueLocalDate ?? '');
        }
      } else if (sort === 'priority') {
        const priorityDifference = TASK_PRIORITY_ORDER[leftTask.priority] - TASK_PRIORITY_ORDER[rightTask.priority];
        if (priorityDifference !== 0) {
          return priorityDifference;
        }
      }
      return leftTask.sortOrder - rightTask.sortOrder || left.index - right.index || leftTask.id.localeCompare(rightTask.id);
    })
    .map(item => item.task);
}

export function nextTaskSortOrder(tasks: readonly Task[], listId: string): number {
  let highest = -1;
  for (const task of tasks) {
    if (task.listId === listId && Number.isSafeInteger(task.sortOrder) && task.sortOrder >= 0) {
      highest = Math.max(highest, task.sortOrder);
    }
  }
  const next = highest + 1;
  if (!Number.isSafeInteger(next)) {
    throw new Error('Task order is full.');
  }
  return next;
}

export function moveTaskRecord(tasks: readonly Task[], taskId: string, direction: 'up' | 'down'): Task[] {
  const task = tasks.find(item => item.id === taskId);
  if (!task) {
    throw new Error('The task no longer exists.');
  }
  if (direction !== 'up' && direction !== 'down') {
    throw new Error('Task move direction is invalid.');
  }
  const ordered = sortTasks(tasks.filter(item => item.listId === task.listId), 'manual');
  const index = ordered.findIndex(item => item.id === taskId);
  const adjacent = ordered[index + (direction === 'up' ? -1 : 1)];
  if (!adjacent) {
    return tasks as Task[];
  }
  return tasks.map(item => {
    if (item.id === task.id) {
      return {...item, sortOrder: adjacent.sortOrder};
    }
    if (item.id === adjacent.id) {
      return {...item, sortOrder: task.sortOrder};
    }
    return item;
  });
}
