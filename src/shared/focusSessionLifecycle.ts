import type {FocusSession, FocusSessionStopReason} from '../types/domain';

export interface FocusSessionDraft {
  taskId: string | null;
  projectId: string | null;
  noteId: string | null;
  appGroupId: string | null;
}

export interface FocusSessionReferenceSets {
  taskIds: ReadonlySet<string>;
  projectIds: ReadonlySet<string>;
  noteIds: ReadonlySet<string>;
  appGroupIds: ReadonlySet<string>;
}

export type FocusSessionFinishAction = 'completed' | 'manual' | 'interrupted';

function validateOptionalLink(value: string | null, ids: ReadonlySet<string> | undefined, label: string): string | null {
  if (value !== null && typeof value !== 'string') {
    return `${label} link is invalid.`;
  }
  if (value !== null && ids && !ids.has(value)) {
    return `Choose a valid ${label.toLowerCase()}.`;
  }
  return null;
}

export function validateFocusSessionDraft(draft: FocusSessionDraft, references?: FocusSessionReferenceSets): string | null {
  if (!draft || typeof draft !== 'object') {
    return 'Focus session links are invalid.';
  }
  return validateOptionalLink(draft.taskId, references?.taskIds, 'Task') ??
    validateOptionalLink(draft.projectId, references?.projectIds, 'Project') ??
    validateOptionalLink(draft.noteId, references?.noteIds, 'Note') ??
    validateOptionalLink(draft.appGroupId, references?.appGroupIds, 'App group');
}

export function createFocusSessionRecord(draft: FocusSessionDraft, id: string, timestamp: string): FocusSession {
  const validationError = validateFocusSessionDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    id,
    startedAt: timestamp,
    endedAt: null,
    status: 'active',
    stopReason: null,
    taskId: draft.taskId,
    projectId: draft.projectId,
    noteId: draft.noteId,
    appGroupId: draft.appGroupId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function finishReason(action: FocusSessionFinishAction): {status: FocusSession['status']; stopReason: Exclude<FocusSessionStopReason, null>} {
  if (action === 'completed') {
    return {status: 'completed', stopReason: 'completed'};
  }
  return {status: 'stopped', stopReason: action};
}

export function finishFocusSession(session: FocusSession, action: FocusSessionFinishAction, endedAt: string): FocusSession {
  if (session.status !== 'active' || session.endedAt !== null) {
    throw new Error('Focus session is already finished.');
  }
  const startMillis = Date.parse(session.startedAt);
  const endMillis = Date.parse(endedAt);
  if (!Number.isFinite(startMillis) || !Number.isFinite(endMillis) || endMillis <= startMillis) {
    throw new Error('Focus session must end after start.');
  }
  if (action !== 'completed' && action !== 'manual' && action !== 'interrupted') {
    throw new Error('Focus session finish action is invalid.');
  }
  return {...session, ...finishReason(action), endedAt, updatedAt: endedAt};
}

export function focusSessionDurationSeconds(session: FocusSession, asOf: string): number {
  const startMillis = Date.parse(session.startedAt);
  const endMillis = Date.parse(session.endedAt ?? asOf);
  if (!Number.isFinite(startMillis) || !Number.isFinite(endMillis) || (session.endedAt !== null && endMillis <= startMillis)) {
    throw new Error('Focus session duration is invalid.');
  }
  if (endMillis <= startMillis) {
    return 0;
  }
  return Math.floor((endMillis - startMillis) / 1000);
}
