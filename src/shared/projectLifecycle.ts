import type {Task, TaskProject, TaskProjectStatus, TaskTemplate} from '../types/domain';

export const TASK_PROJECT_MAX_NAME_LENGTH = 80;

export interface ProjectDraft {
  name: string;
  status: TaskProjectStatus;
}

export function validateProjectName(projects: readonly TaskProject[], draft: ProjectDraft, excludedProjectId: string | null = null): string | null {
  const normalizedName = draft.name.trim().toLocaleLowerCase();
  if (projects.some(project => project.id !== excludedProjectId && project.name.toLocaleLowerCase() === normalizedName)) {
    return 'Project names must be unique.';
  }
  return null;
}

export function validateProjectDraft(draft: ProjectDraft): string | null {
  if (typeof draft.name !== 'string' || !draft.name.trim()) {
    return 'Project name is required.';
  }
  if (draft.name.trim().length > TASK_PROJECT_MAX_NAME_LENGTH) {
    return `Project name must be ${TASK_PROJECT_MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (draft.status !== 'active' && draft.status !== 'completed') {
    return 'Choose a valid project status.';
  }
  return null;
}

export function createProjectRecord(draft: ProjectDraft, id: string, timestamp: string): TaskProject {
  const validationError = validateProjectDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    id,
    name: draft.name.trim(),
    status: draft.status,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateProjectRecord(project: TaskProject, draft: ProjectDraft, timestamp: string): TaskProject {
  const validationError = validateProjectDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }
  return {...project, name: draft.name.trim(), status: draft.status, updatedAt: timestamp};
}

export function deleteProjectRecord(projects: TaskProject[], tasks: readonly Task[], projectId: string, templates: readonly TaskTemplate[] = []): TaskProject[] {
  if (!projects.some(project => project.id === projectId)) {
    throw new Error('The project no longer exists.');
  }
  if (tasks.some(task => task.projectId === projectId)) {
    throw new Error('Projects with tasks cannot be deleted.');
  }
  if (templates.some(template => template.projectId === projectId)) {
    throw new Error('Projects with task templates cannot be deleted.');
  }
  return projects.filter(project => project.id !== projectId);
}

export function setProjectArchived(projects: TaskProject[], projectId: string, isArchived: boolean, timestamp = new Date().toISOString()): TaskProject[] {
  if (!projects.some(project => project.id === projectId)) {
    throw new Error('The project no longer exists.');
  }
  return projects.map(project => project.id === projectId ? {...project, isArchived, updatedAt: timestamp} : project);
}
