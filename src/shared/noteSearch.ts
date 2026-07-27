import type {Note} from '../types/domain';

export const NOTE_MAX_TAGS = 20;
export const NOTE_MAX_TAG_LENGTH = 40;

export function normalizeNoteTags(input: string): string[] {
  return [...new Set(input.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean))];
}

export function validateNoteTags(tags: unknown): tags is string[] {
  if (!Array.isArray(tags) || tags.length > NOTE_MAX_TAGS) {
    return false;
  }
  const seen = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== 'string' || tag.length === 0 || tag.length > NOTE_MAX_TAG_LENGTH || tag !== tag.trim() || tag !== tag.toLowerCase() || seen.has(tag)) {
      return false;
    }
    seen.add(tag);
  }
  return true;
}

export function noteMatchesQuery(note: Note, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return [note.title, note.body, ...note.tags].some(value => value.toLowerCase().includes(normalizedQuery));
}
