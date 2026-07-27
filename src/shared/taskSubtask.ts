import type {Task} from '../types/domain';

export function validateTaskParentLink(taskId: string, parentTaskId: string | null, tasks: readonly Task[]): string | null {
  if (parentTaskId === null) {
    return null;
  }
  const task = tasks.find(item => item.id === taskId);
  const parent = tasks.find(item => item.id === parentTaskId);
  if (!task || !parent) {
    return 'The parent task must exist.';
  }
  if (task.id === parent.id) {
    return 'A task cannot be its own parent.';
  }
  if (task.listId !== parent.listId) {
    return 'A subtask and its parent must use the same list.';
  }
  const parentByTaskId = new Map(tasks.map(item => [item.id, item.parentTaskId]));
  const visited = new Set<string>();
  let current: string | null = parent.id;
  while (current !== null) {
    if (current === task.id) {
      return 'This parent link would create a subtask cycle.';
    }
    if (visited.has(current)) {
      return 'The existing subtask links contain a cycle.';
    }
    visited.add(current);
    current = parentByTaskId.get(current) ?? null;
  }
  return null;
}

export function linkTaskParent(task: Task, parentTaskId: string | null, timestamp: string): Task {
  return {...task, parentTaskId, updatedAt: timestamp};
}

export function promoteSubtasksAfterDelete(tasks: readonly Task[], deletedTaskId: string, timestamp: string): Task[] {
  if (!tasks.some(task => task.id === deletedTaskId)) {
    throw new Error('The task no longer exists.');
  }
  return tasks
    .filter(task => task.id !== deletedTaskId)
    .map(task => task.parentTaskId === deletedTaskId ? {...task, parentTaskId: null, updatedAt: timestamp} : task);
}
