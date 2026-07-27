import type {Task, TaskList} from '../types/domain';
import {TASK_INBOX_LIST_ID} from './taskLifecycle';

export {TASK_INBOX_LIST_ID};
export const TASK_LIST_MAX_NAME_LENGTH = 60;

export interface TaskListDraft {
  name: string;
}

export function validateTaskListDraft(
  draft: TaskListDraft,
  lists: ReadonlyArray<TaskList> = [],
  excludeId: string | null = null,
): string | null {
  if (typeof draft.name !== 'string' || !draft.name.trim()) {
    return 'Task list name is required.';
  }
  const name = draft.name.trim();
  if (name.length > TASK_LIST_MAX_NAME_LENGTH) {
    return `Task list name must be ${TASK_LIST_MAX_NAME_LENGTH} characters or fewer.`;
  }
  const normalizedName = name.toLocaleLowerCase();
  if (lists.some(list => list.id !== excludeId && list.name.trim().toLocaleLowerCase() === normalizedName)) {
    return 'A task list with that name already exists.';
  }
  return null;
}

export function createTaskListRecord(
  draft: TaskListDraft,
  id: string,
  timestamp: string,
  lists: ReadonlyArray<TaskList> = [],
): TaskList {
  const validationError = validateTaskListDraft(draft, lists);
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    id,
    name: draft.name.trim(),
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateTaskListRecord(
  list: TaskList,
  draft: TaskListDraft,
  timestamp: string,
  lists: ReadonlyArray<TaskList>,
): TaskList {
  const validationError = validateTaskListDraft(draft, lists, list.id);
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    ...list,
    name: draft.name.trim(),
    updatedAt: timestamp,
  };
}

export function setTaskListArchived(lists: TaskList[], listId: string, isArchived: boolean, timestamp = new Date().toISOString()): TaskList[] {
  const list = lists.find(item => item.id === listId);
  if (!list) {
    throw new Error('The task list no longer exists.');
  }
  if (listId === TASK_INBOX_LIST_ID && isArchived) {
    throw new Error('Inbox cannot be archived.');
  }
  return lists.map(item => item.id === listId ? {...item, isArchived, updatedAt: timestamp} : item);
}

export function deleteTaskListRecord(lists: TaskList[], tasks: Task[], listId: string): TaskList[] {
  if (listId === TASK_INBOX_LIST_ID) {
    throw new Error('Inbox cannot be deleted.');
  }
  if (!lists.some(list => list.id === listId)) {
    throw new Error('The task list no longer exists.');
  }
  if (tasks.some(task => task.listId === listId)) {
    throw new Error('Tasks use this list. Move them before deleting it.');
  }
  return lists.filter(list => list.id !== listId);
}
