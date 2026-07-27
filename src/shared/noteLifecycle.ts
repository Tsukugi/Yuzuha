import type {Note} from '../types/domain';
import {noteMatchesQuery, validateNoteTags} from './noteSearch';

export interface NoteDraft {
  title: string;
  body: string;
  tags: string[];
}

export function validateNoteDraft(draft: NoteDraft): string | null {
  if (!draft.title.trim()) {
    return 'Give the note a short title.';
  }
  if (!validateNoteTags(draft.tags)) {
    return 'Note tags are invalid. Use up to 20 lowercase tags with 40 characters each.';
  }
  return null;
}

export function updateNoteRecord(note: Note, draft: NoteDraft, updatedAt: string): Note {
  return {
    ...note,
    title: draft.title.trim(),
    body: draft.body,
    tags: draft.tags,
    updatedAt,
  };
}

export function filterNotes(
  notes: Note[],
  query: string,
  showArchived: boolean,
  attachmentNamesByNoteId: ReadonlyMap<string, readonly string[]> = new Map(),
): Note[] {
  return notes
    .filter(note => (showArchived || !note.isArchived) && noteMatchesQuery(note, query, attachmentNamesByNoteId.get(note.id) ?? []))
    .sort((left, right) => Number(right.isPinned) - Number(left.isPinned) || right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id));
}
