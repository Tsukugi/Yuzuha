import {emptyAppData} from '../types/domain';
import {searchGlobal} from './globalSearch';

describe('global search', () => {
  it('matches supported local records by their searchable text', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_work',
      title: 'Planning',
      body: 'Review the contract',
      tags: ['work'],
      isPinned: false,
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.attachments.push({
      id: 'attachment_contract',
      noteId: 'note_work',
      name: 'contract.pdf',
      mimeType: 'application/pdf',
      byteSize: 12,
      sha256: 'a'.repeat(64),
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.tasks.push({
      id: 'task_work',
      title: 'Call the work contact',
      details: '',
      status: 'open',
      dueLocalDate: null,
      priority: 'normal',
      listId: 'task_list_inbox',
      sourceNoteId: null,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.money.push({
      id: 'money_work',
      kind: 'expense',
      amountMinor: 1250,
      currency: 'EUR',
      accountId: 'account_everyday',
      categoryId: 'category_food',
      category: 'Food',
      note: 'Work lunch',
      occurredAt: '2026-07-27T00:00:00.000Z',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.savedSearches.push({
      id: 'saved_search_work',
      name: 'Work notes',
      query: 'work',
      showArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.taskLists.push({
      id: 'task_list_project',
      name: 'Project work',
      isArchived: false,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });

    const results = searchGlobal(data, 'CONTRACT');
    expect(results.map(result => result.kind)).toEqual(['note']);
    expect(results[0]).toMatchObject({id: 'note_work', title: 'Planning'});

    const workResults = searchGlobal(data, 'work');
    expect(workResults.map(result => result.kind)).toEqual(['money', 'note', 'saved-search', 'task', 'task-list']);
  });

  it('hides archived records and inaccessible app-time data by default', () => {
    const data = emptyAppData();
    data.notes.push({
      id: 'note_archived',
      title: 'Archived secret',
      body: '',
      tags: [],
      isPinned: false,
      isArchived: true,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    });
    data.timeGoals.push({id: 'goal_archived', name: 'Archived secret goal', period: 'week', targetSeconds: 3600, isArchived: true});
    data.usageSnapshots.push({
      id: 'usage_secret',
      packageName: 'com.example.secret',
      displayName: 'Secret App',
      localDate: '2026-07-27',
      durationSeconds: 60,
      sourceReadAt: '2026-07-27T00:00:00.000Z',
      included: true,
    });

    expect(searchGlobal(data, 'secret')).toEqual([]);
    expect(searchGlobal(data, 'secret', {includeArchived: true}).map(result => result.kind)).toEqual(['note', 'time-goal']);

    data.usageRead.permission = 'granted';
    expect(searchGlobal(data, 'secret', {includeArchived: true}).map(result => result.kind)).toEqual(['note', 'time-goal', 'usage']);
  });
});
