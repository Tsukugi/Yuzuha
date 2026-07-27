import {createSavedSearch, validateSavedSearchDraft} from './savedSearch';

describe('saved search rules', () => {
  it('trims and validates a saved search draft', () => {
    expect(validateSavedSearchDraft({name: ' Work notes ', query: ' work ', showArchived: false})).toBeNull();
    expect(createSavedSearch(
      {name: ' Work notes ', query: ' work ', showArchived: false},
      'saved_1',
      '2026-07-27T12:00:00.000Z',
    )).toEqual({
      id: 'saved_1',
      name: 'Work notes',
      query: 'work',
      showArchived: false,
      createdAt: '2026-07-27T12:00:00.000Z',
      updatedAt: '2026-07-27T12:00:00.000Z',
    });
  });

  it('rejects blank, overlong, and malformed saved search fields', () => {
    expect(validateSavedSearchDraft({name: ' ', query: 'work', showArchived: false})).toMatch(/name/i);
    expect(validateSavedSearchDraft({name: 'Work', query: ' ', showArchived: false})).toMatch(/query/i);
    expect(validateSavedSearchDraft({name: 'x'.repeat(81), query: 'work', showArchived: false})).toMatch(/name/i);
    expect(validateSavedSearchDraft({name: 'Work', query: 'x'.repeat(201), showArchived: false})).toMatch(/query/i);
    expect(validateSavedSearchDraft({name: 'Work', query: 'work', showArchived: 'no' as never})).toMatch(/archived/i);
  });
});
