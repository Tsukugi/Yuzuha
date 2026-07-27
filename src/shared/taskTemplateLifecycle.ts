import type {Task, TaskPriority, TaskTemplate} from '../types/domain';
import {createTaskRecord} from './taskLifecycle';

export const TASK_TEMPLATE_MAX_NAME_LENGTH = 80;

export interface TaskTemplateDraft {
  name: string;
  title: string;
  details: string;
  priority: TaskPriority;
  listId: string;
  projectId?: string | null;
}

export function validateTaskTemplateName(templates: readonly TaskTemplate[], draft: TaskTemplateDraft, excludedTemplateId: string | null = null): string | null {
  const normalizedName = draft.name.trim().toLocaleLowerCase();
  if (templates.some(template => template.id !== excludedTemplateId && template.name.toLocaleLowerCase() === normalizedName)) {
    return 'Template names must be unique.';
  }
  return null;
}

export function validateTaskTemplateDraft(draft: TaskTemplateDraft, listIds: ReadonlySet<string>, projectIds: ReadonlySet<string>): string | null {
  if (typeof draft.name !== 'string' || !draft.name.trim()) {
    return 'Template name is required.';
  }
  if (draft.name.trim().length > TASK_TEMPLATE_MAX_NAME_LENGTH) {
    return `Template name must be ${TASK_TEMPLATE_MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (typeof draft.title !== 'string' || !draft.title.trim()) {
    return 'Template task title is required.';
  }
  if (typeof draft.details !== 'string') {
    return 'Template task details are invalid.';
  }
  if (draft.priority !== 'low' && draft.priority !== 'normal' && draft.priority !== 'high') {
    return 'Choose a valid template priority.';
  }
  if (typeof draft.listId !== 'string' || !listIds.has(draft.listId)) {
    return 'Choose a valid template task list.';
  }
  if (draft.projectId !== undefined && draft.projectId !== null && !projectIds.has(draft.projectId)) {
    return 'Choose a valid template project.';
  }
  return null;
}

export function createTaskTemplateRecord(draft: TaskTemplateDraft, id: string, timestamp: string, templates: readonly TaskTemplate[] = [], listIds: ReadonlySet<string> = new Set([draft.listId]), projectIds: ReadonlySet<string> = draft.projectId ? new Set([draft.projectId]) : new Set()): TaskTemplate {
  const validationError = validateTaskTemplateDraft(draft, listIds, projectIds) ?? validateTaskTemplateName(templates, draft);
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    id,
    name: draft.name.trim(),
    title: draft.title.trim(),
    details: draft.details.trim(),
    priority: draft.priority,
    listId: draft.listId,
    projectId: draft.projectId ?? null,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateTaskTemplateRecord(template: TaskTemplate, draft: TaskTemplateDraft, timestamp: string, templates: readonly TaskTemplate[] = [], listIds: ReadonlySet<string> = new Set([draft.listId]), projectIds: ReadonlySet<string> = draft.projectId ? new Set([draft.projectId]) : new Set()): TaskTemplate {
  const validationError = validateTaskTemplateDraft(draft, listIds, projectIds) ?? validateTaskTemplateName(templates, draft, template.id);
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    ...template,
    name: draft.name.trim(),
    title: draft.title.trim(),
    details: draft.details.trim(),
    priority: draft.priority,
    listId: draft.listId,
    projectId: draft.projectId ?? null,
    updatedAt: timestamp,
  };
}

export function setTaskTemplateArchived(templates: readonly TaskTemplate[], templateId: string, isArchived: boolean, timestamp: string): TaskTemplate[] {
  if (!templates.some(template => template.id === templateId)) {
    throw new Error('The task template no longer exists.');
  }
  return templates.map(template => template.id === templateId ? {...template, isArchived, updatedAt: timestamp} : template);
}

export function deleteTaskTemplateRecord(templates: readonly TaskTemplate[], templateId: string): TaskTemplate[] {
  if (!templates.some(template => template.id === templateId)) {
    throw new Error('The task template no longer exists.');
  }
  return templates.filter(template => template.id !== templateId);
}

export function createTaskFromTemplateRecord(template: TaskTemplate, taskId: string, timestamp: string, sortOrder: number, projectIds: ReadonlySet<string> = template.projectId ? new Set([template.projectId]) : new Set()): Task {
  return createTaskRecord({
    title: template.title,
    details: template.details,
    dueLocalDate: null,
    priority: template.priority,
    listId: template.listId,
    projectId: template.projectId,
    parentTaskId: null,
  }, taskId, timestamp, null, sortOrder, projectIds);
}
