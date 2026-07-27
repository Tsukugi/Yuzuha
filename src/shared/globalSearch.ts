import type {AppData} from '../types/domain';

export type GlobalSearchKind =
  | 'app-group'
  | 'account'
  | 'budget'
  | 'category'
  | 'money'
  | 'note'
  | 'focus-session'
  | 'project'
  | 'recurrence'
  | 'saved-search'
  | 'split'
  | 'task'
  | 'task-list'
  | 'time-goal'
  | 'transfer'
  | 'usage';

export interface GlobalSearchResult {
  id: string;
  kind: GlobalSearchKind;
  title: string;
  detail: string;
  isArchived?: boolean;
}

export interface GlobalSearchOptions {
  includeArchived?: boolean;
}

const KIND_ORDER: Record<GlobalSearchKind, number> = {
  money: 0,
  note: 1,
  project: 2,
  'app-group': 3,
  'saved-search': 4,
  task: 5,
  'task-list': 6,
  'focus-session': 7,
  account: 8,
  category: 9,
  transfer: 10,
  split: 11,
  budget: 12,
  recurrence: 13,
  'time-goal': 14,
  usage: 15,
};

function includesQuery(query: string, values: Array<string | number | null | undefined>): boolean {
  const needle = query.trim().toLocaleLowerCase();
  return needle.length > 0 && values.some(value => value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(needle));
}

function isVisible(isArchived: boolean | undefined, includeArchived: boolean): boolean {
  return !isArchived || includeArchived;
}

function sortResults(results: Array<{result: GlobalSearchResult; order: number}>): GlobalSearchResult[] {
  return results
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }
      const leftTitle = left.result.title.toLocaleLowerCase();
      const rightTitle = right.result.title.toLocaleLowerCase();
      if (leftTitle !== rightTitle) {
        return leftTitle < rightTitle ? -1 : 1;
      }
      return left.result.id < right.result.id ? -1 : left.result.id > right.result.id ? 1 : 0;
    })
    .map(item => item.result);
}

export function searchGlobal(data: AppData, query: string, options: GlobalSearchOptions = {}): GlobalSearchResult[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const includeArchived = options.includeArchived === true;
  const results: Array<{result: GlobalSearchResult; order: number}> = [];
  const accountNames = new Map(data.accounts.map(account => [account.id, account.name]));
  const categoryNames = new Map(data.categories.map(category => [category.id, category.name]));
  const taskTitles = new Map(data.tasks.map(task => [task.id, task.title]));
  const projectNames = new Map(data.projects.map(project => [project.id, project.name]));
  const noteTitles = new Map(data.notes.map(note => [note.id, note.title]));
  const appGroupNames = new Map(data.appGroups.map(appGroup => [appGroup.id, appGroup.name]));
  const attachmentNames = new Map<string, string[]>();

  data.attachments.forEach(attachment => {
    const names = attachmentNames.get(attachment.noteId) ?? [];
    names.push(attachment.name);
    attachmentNames.set(attachment.noteId, names);
  });

  const add = (kind: GlobalSearchKind, result: Omit<GlobalSearchResult, 'kind'>) => {
    results.push({result: {...result, kind}, order: KIND_ORDER[kind]});
  };

  data.money.forEach(entry => {
    const accountName = entry.accountId ? accountNames.get(entry.accountId) : undefined;
    const categoryName = entry.categoryId ? categoryNames.get(entry.categoryId) : entry.category;
    if (includesQuery(normalizedQuery, [entry.kind, entry.amountMinor, entry.currency, categoryName, accountName, entry.note, entry.occurredAt])) {
      add('money', {
        id: entry.id,
        title: `${entry.kind === 'expense' ? 'Expense' : 'Income'} · ${categoryName ?? 'Uncategorized'}`,
        detail: `${entry.amountMinor} ${entry.currency}${entry.note ? ` · ${entry.note}` : ''}`,
      });
    }
  });

  data.notes.forEach(note => {
    if (!isVisible(note.isArchived, includeArchived)) {
      return;
    }
    const names = attachmentNames.get(note.id) ?? [];
    if (includesQuery(normalizedQuery, [note.title, note.body, ...note.tags, ...names, note.updatedAt])) {
      add('note', {
        id: note.id,
        title: note.title,
        detail: [note.body, note.tags.join(', '), names.join(', ')].filter(Boolean).join(' · ') || 'No preview',
        isArchived: note.isArchived,
      });
    }
  });

  data.savedSearches.forEach(savedSearch => {
    if (includesQuery(normalizedQuery, [savedSearch.name, savedSearch.query])) {
      add('saved-search', {
        id: savedSearch.id,
        title: savedSearch.name,
        detail: `${savedSearch.query}${savedSearch.showArchived ? ' · includes archived' : ''}`,
      });
    }
  });

  data.projects.forEach(project => {
    if (isVisible(project.isArchived, includeArchived) && includesQuery(normalizedQuery, [project.name, project.status])) {
      add('project', {
        id: project.id,
        title: project.name,
        detail: `${project.status === 'completed' ? 'Completed' : 'Active'} project`,
        isArchived: project.isArchived,
      });
    }
  });

  data.appGroups.forEach(appGroup => {
    if (isVisible(appGroup.isArchived, includeArchived) && includesQuery(normalizedQuery, [appGroup.name, ...appGroup.packageNames, appGroup.isArchived ? 'archived' : 'active'])) {
      add('app-group', {
        id: appGroup.id,
        title: appGroup.name,
        detail: `${appGroup.isArchived ? 'Archived' : 'Active'} app group Â· ${appGroup.packageNames.length} apps`,
        isArchived: appGroup.isArchived,
      });
    }
  });

  data.tasks.forEach(task => {
    if (includesQuery(normalizedQuery, [task.title, task.details, task.status, task.dueLocalDate])) {
      add('task', {
        id: task.id,
        title: task.title,
        detail: [task.status, task.details, task.dueLocalDate].filter(Boolean).join(' · '),
      });
    }
  });

  data.taskLists.forEach(taskList => {
    if (isVisible(taskList.isArchived, includeArchived) && includesQuery(normalizedQuery, [taskList.name, taskList.isArchived ? 'archived' : 'active'])) {
      add('task-list', {
        id: taskList.id,
        title: taskList.name,
        detail: `${taskList.isArchived ? 'Archived' : 'Active'} task list`,
        isArchived: taskList.isArchived,
      });
    }
  });

  data.accounts.forEach(account => {
    if (isVisible(account.isArchived, includeArchived) && includesQuery(normalizedQuery, [account.name, account.currency])) {
      add('account', {
        id: account.id,
        title: account.name,
        detail: `${account.currency} account`,
        isArchived: account.isArchived,
      });
    }
  });

  data.categories.forEach(category => {
    if (isVisible(category.isArchived, includeArchived) && includesQuery(normalizedQuery, [category.name, category.kind])) {
      add('category', {
        id: category.id,
        title: category.name,
        detail: `${category.kind} category`,
        isArchived: category.isArchived,
      });
    }
  });

  data.transfers.forEach(transfer => {
    const fromName = accountNames.get(transfer.fromAccountId) ?? transfer.fromAccountId;
    const toName = accountNames.get(transfer.toAccountId) ?? transfer.toAccountId;
    if (includesQuery(normalizedQuery, [fromName, toName, transfer.amountMinor, transfer.currency, transfer.note, transfer.occurredAt])) {
      add('transfer', {
        id: transfer.id,
        title: `Transfer · ${fromName} → ${toName}`,
        detail: `${transfer.amountMinor} ${transfer.currency}${transfer.note ? ` · ${transfer.note}` : ''}`,
      });
    }
  });

  data.splits.forEach(split => {
    const parent = data.money.find(entry => entry.id === split.parentEntryId);
    const lineText = split.lines.flatMap(line => [line.category, line.note, line.amountMinor]);
    if (includesQuery(normalizedQuery, [parent?.kind, parent?.amountMinor, parent?.currency, ...lineText])) {
      add('split', {
        id: split.id,
        title: `Split entry · ${parent?.currency ?? 'unknown currency'}`,
        detail: split.lines.map(line => `${line.category}: ${line.amountMinor}`).join(' · '),
      });
    }
  });

  data.budgets.forEach(budget => {
    if (isVisible(budget.isArchived, includeArchived) && includesQuery(normalizedQuery, [budget.category, categoryNames.get(budget.categoryId), budget.amountMinor, budget.currency, budget.period, budget.rollover])) {
      add('budget', {
        id: budget.id,
        title: `Budget · ${budget.category || categoryNames.get(budget.categoryId) || 'Uncategorized'}`,
        detail: `${budget.amountMinor} ${budget.currency} · ${budget.period}`,
        isArchived: budget.isArchived,
      });
    }
  });

  data.recurrences.forEach(rule => {
    if (includesQuery(normalizedQuery, [rule.kind, rule.category, categoryNames.get(rule.categoryId ?? ''), rule.amountMinor, rule.currency, rule.note, rule.cadence, rule.nextOccurrenceLocalDate, rule.missedOccurrencePolicy])) {
      add('recurrence', {
        id: rule.id,
        title: `Recurring ${rule.kind} · ${rule.category || categoryNames.get(rule.categoryId ?? '') || 'Uncategorized'}`,
        detail: `${rule.amountMinor} ${rule.currency} · ${rule.cadence} · next ${rule.nextOccurrenceLocalDate}${rule.isPaused ? ' · paused' : ''}`,
      });
    }
  });

  data.timeGoals.forEach(goal => {
    if (isVisible(goal.isArchived, includeArchived) && includesQuery(normalizedQuery, [goal.name, goal.period, goal.targetSeconds])) {
      add('time-goal', {
        id: goal.id,
        title: goal.name,
        detail: `${goal.period} goal · ${goal.targetSeconds} seconds`,
        isArchived: goal.isArchived,
      });
    }
  });

  data.focusSessions.forEach(session => {
    const taskTitle = session.taskId ? taskTitles.get(session.taskId) ?? 'Deleted task' : null;
    const projectName = session.projectId ? projectNames.get(session.projectId) ?? 'Deleted project' : null;
    const noteTitle = session.noteId ? noteTitles.get(session.noteId) ?? 'Deleted note' : null;
    const appGroupName = session.appGroupId ? appGroupNames.get(session.appGroupId) ?? 'Deleted app group' : null;
    if (includesQuery(normalizedQuery, [session.status, session.stopReason, session.startedAt, session.endedAt, taskTitle, projectName, noteTitle, appGroupName])) {
      add('focus-session', {
        id: session.id,
        title: `Focus session Â· ${session.startedAt.slice(0, 10)}`,
        detail: [session.status, taskTitle, projectName, noteTitle, appGroupName].filter(Boolean).join(' Â· '),
      });
    }
  });

  if (data.usageRead.permission === 'granted') {
    data.usageSnapshots.forEach(snapshot => {
      if (snapshot.included && includesQuery(normalizedQuery, [snapshot.displayName, snapshot.packageName, snapshot.localDate])) {
        add('usage', {
          id: snapshot.id,
          title: snapshot.displayName,
          detail: `${snapshot.localDate} · ${snapshot.packageName}`,
        });
      }
    });
  }

  return sortResults(results);
}
