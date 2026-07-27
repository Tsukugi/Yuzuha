import type {SavedSearch} from '../types/domain';

export const SAVED_SEARCH_MAX_NAME_LENGTH = 80;
export const SAVED_SEARCH_MAX_QUERY_LENGTH = 200;

export interface SavedSearchDraft {
  name: string;
  query: string;
  showArchived: boolean;
}

export function validateSavedSearchDraft(draft: SavedSearchDraft): string | null {
  if (typeof draft.name !== 'string' || !draft.name.trim()) {
    return 'Give the saved search a name.';
  }
  if (draft.name.trim().length > SAVED_SEARCH_MAX_NAME_LENGTH) {
    return `Saved search names must be ${SAVED_SEARCH_MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (typeof draft.query !== 'string' || !draft.query.trim()) {
    return 'Enter a search query before saving it.';
  }
  if (draft.query.trim().length > SAVED_SEARCH_MAX_QUERY_LENGTH) {
    return `Saved search query must be ${SAVED_SEARCH_MAX_QUERY_LENGTH} characters or fewer.`;
  }
  if (typeof draft.showArchived !== 'boolean') {
    return 'Saved search archived-note visibility is invalid.';
  }
  return null;
}

export function createSavedSearch(draft: SavedSearchDraft, id: string, timestamp: string): SavedSearch {
  const validationError = validateSavedSearchDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    id,
    name: draft.name.trim(),
    query: draft.query.trim(),
    showArchived: draft.showArchived,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
