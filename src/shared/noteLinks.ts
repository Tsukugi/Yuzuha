import type {AppData, NoteLink, NoteLinkTargetType} from '../types/domain';

export interface NoteLinkDraft {
  noteId: string;
  targetType: NoteLinkTargetType;
  targetId: string;
}

export const NOTE_LINK_TARGET_TYPES: readonly NoteLinkTargetType[] = ['task', 'project', 'money', 'focus-session'];

export function validateNoteLinkDraft(draft: NoteLinkDraft, data: AppData, existing: NoteLink[]): string | null {
  if (!data.notes.some(note => note.id === draft.noteId)) {
    return 'The note is missing.';
  }
  if (!NOTE_LINK_TARGET_TYPES.includes(draft.targetType)) {
    return 'The note link type is invalid.';
  }
  if (!draft.targetId.trim() || !targetExists(draft.targetType, draft.targetId, data)) {
    return 'The note link target is missing.';
  }
  if (existing.some(link => noteLinkKey(link) === noteLinkKey(draft))) {
    return 'This record is already linked to the note.';
  }
  return null;
}

export function createNoteLinkRecord(draft: NoteLinkDraft, id: string, createdAt: string): NoteLink {
  return {id, noteId: draft.noteId, targetType: draft.targetType, targetId: draft.targetId, createdAt};
}

export function noteLinkKey(link: Pick<NoteLink, 'noteId' | 'targetType' | 'targetId'>): string {
  return `${link.noteId}:${link.targetType}:${link.targetId}`;
}

export function targetExists(targetType: NoteLinkTargetType, targetId: string, data: AppData): boolean {
  switch (targetType) {
    case 'task':
      return data.tasks.some(task => task.id === targetId);
    case 'project':
      return data.projects.some(project => project.id === targetId);
    case 'money':
      return data.money.some(entry => entry.id === targetId);
    case 'focus-session':
      return data.focusSessions.some(session => session.id === targetId);
  }
}
