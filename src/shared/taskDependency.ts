import type {Task, TaskDependency} from '../types/domain';

export interface TaskDependencyDraft {
  sourceTaskId: string;
  dependentTaskId: string;
}

export function validateTaskDependencyDraft(
  draft: TaskDependencyDraft,
  tasks: readonly Task[],
  dependencies: readonly TaskDependency[],
): string | null {
  if (!isNonEmptyId(draft.sourceTaskId) || !isNonEmptyId(draft.dependentTaskId)) {
    return 'Choose two tasks.';
  }
  if (!tasks.some(task => task.id === draft.sourceTaskId) || !tasks.some(task => task.id === draft.dependentTaskId)) {
    return 'Both dependency tasks must exist.';
  }
  if (draft.sourceTaskId === draft.dependentTaskId) {
    return 'A task cannot depend on itself.';
  }
  if (dependencies.some(dependency => dependency.sourceTaskId === draft.sourceTaskId && dependency.dependentTaskId === draft.dependentTaskId)) {
    return 'This task dependency already exists.';
  }
  const outgoing = new Map<string, string[]>();
  for (const dependency of dependencies) {
    const targets = outgoing.get(dependency.dependentTaskId) ?? [];
    targets.push(dependency.sourceTaskId);
    outgoing.set(dependency.dependentTaskId, targets);
  }
  if (hasPath(outgoing, draft.sourceTaskId, draft.dependentTaskId)) {
    return 'This dependency would create a cycle.';
  }
  return null;
}

export function createTaskDependencyRecord(draft: TaskDependencyDraft, id: string, timestamp: string): TaskDependency {
  return {
    id,
    sourceTaskId: draft.sourceTaskId,
    dependentTaskId: draft.dependentTaskId,
    dependencyType: 'completed',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getBlockingTaskIds(
  taskId: string,
  tasks: readonly Task[],
  dependencies: readonly TaskDependency[],
): string[] {
  const taskById = new Map(tasks.map(task => [task.id, task]));
  return dependencies
    .filter(dependency => dependency.dependentTaskId === taskId && dependency.dependencyType === 'completed')
    .filter(dependency => taskById.get(dependency.sourceTaskId)?.status !== 'completed')
    .map(dependency => dependency.sourceTaskId);
}

export function deleteTaskDependencyRecord(dependencies: readonly TaskDependency[], dependencyId: string): TaskDependency[] {
  if (!dependencies.some(dependency => dependency.id === dependencyId)) {
    throw new Error('The task dependency no longer exists.');
  }
  return dependencies.filter(dependency => dependency.id !== dependencyId);
}

function isNonEmptyId(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasPath(outgoing: Map<string, string[]>, start: string, target: string): boolean {
  const visited = new Set<string>();
  const pending = [start];
  while (pending.length > 0) {
    const current = pending.pop() as string;
    if (current === target) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    pending.push(...(outgoing.get(current) ?? []));
  }
  return false;
}
