import type {AppData, NoteLink, NoteLinkTargetType} from '../types/domain';

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
  | 'task-template'
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
  'task-template': 16,
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

function noteLinkTypeLabel(type: NoteLinkTargetType): string {
  switch (type) {
    case 'task':
      return 'task';
    case 'project':
      return 'project';
    case 'money':
      return 'money';
    case 'focus-session':
      return 'focus session';
  }
}

function noteLinkSearchInfo(
  link: NoteLink,
  maps: {
    accountNames: Map<string, string>;
    categoryNames: Map<string, string>;
    payeeNames: Map<string, string>;
    tasks: Map<string, AppData['tasks'][number]>;
    projects: Map<string, AppData['projects'][number]>;
    money: Map<string, AppData['money'][number]>;
    focusSessions: Map<string, AppData['focusSessions'][number]>;
    taskTitles: Map<string, string>;
    projectNames: Map<string, string>;
    noteTitles: Map<string, string>;
    appGroupNames: Map<string, string>;
  },
  includeArchived: boolean,
): {label: string; searchValues: Array<string | number | null | undefined>} {
  const typeLabel = noteLinkTypeLabel(link.targetType);
  switch (link.targetType) {
    case 'task': {
      const task = maps.tasks.get(link.targetId);
      return task
        ? {label: `Linked ${typeLabel}: ${task.title}`, searchValues: [typeLabel, task.title, task.details, task.status, task.dueLocalDate]}
        : {label: `Linked ${typeLabel}: Deleted task`, searchValues: [typeLabel]};
    }
    case 'project': {
      const project = maps.projects.get(link.targetId);
      if (!project) {
        return {label: `Linked ${typeLabel}: Deleted project`, searchValues: [typeLabel]};
      }
      return {
        label: `Linked ${typeLabel}: ${project.name}`,
        searchValues: isVisible(project.isArchived, includeArchived) ? [typeLabel, project.name, project.status] : [typeLabel],
      };
    }
    case 'money': {
      const entry = maps.money.get(link.targetId);
      if (!entry) {
        return {label: `Linked ${typeLabel}: Deleted entry`, searchValues: [typeLabel]};
      }
      const accountName = entry.accountId ? maps.accountNames.get(entry.accountId) : undefined;
      const categoryName = entry.categoryId ? maps.categoryNames.get(entry.categoryId) : entry.category;
      const payeeName = entry.payeeId ? maps.payeeNames.get(entry.payeeId) : undefined;
      const title = `${entry.kind === 'expense' ? 'Expense' : 'Income'} · ${categoryName ?? 'Uncategorized'}${payeeName ? ` · ${payeeName}` : ''}`;
      return {
        label: `Linked ${typeLabel}: ${title}`,
        searchValues: [typeLabel, entry.kind, entry.amountMinor, entry.currency, categoryName, accountName, payeeName, entry.note, entry.occurredAt],
      };
    }
    case 'focus-session': {
      const session = maps.focusSessions.get(link.targetId);
      if (!session) {
        return {label: `Linked ${typeLabel}: Deleted focus session`, searchValues: [typeLabel]};
      }
      const taskTitle = session.taskId ? maps.taskTitles.get(session.taskId) ?? 'Deleted task' : null;
      const projectName = session.projectId ? maps.projectNames.get(session.projectId) ?? 'Deleted project' : null;
      const noteTitle = session.noteId ? maps.noteTitles.get(session.noteId) ?? 'Deleted note' : null;
      const appGroupName = session.appGroupId ? maps.appGroupNames.get(session.appGroupId) ?? 'Deleted app group' : null;
      const date = session.startedAt.slice(0, 10);
      return {
        label: `Linked ${typeLabel}: ${date}`,
        searchValues: [typeLabel, session.status, session.stopReason, session.startedAt, session.endedAt, taskTitle, projectName, noteTitle, appGroupName],
      };
    }
  }
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
  const payeeNames = new Map(data.payees.map(payee => [payee.id, payee.name]));
  const tasks = new Map(data.tasks.map(task => [task.id, task]));
  const projects = new Map(data.projects.map(project => [project.id, project]));
  const money = new Map(data.money.map(entry => [entry.id, entry]));
  const focusSessions = new Map(data.focusSessions.map(session => [session.id, session]));
  const taskTitles = new Map(data.tasks.map(task => [task.id, task.title]));
  const projectNames = new Map(data.projects.map(project => [project.id, project.name]));
  const noteTitles = new Map(data.notes.map(note => [note.id, note.title]));
  const appGroupNames = new Map(data.appGroups.map(appGroup => [appGroup.id, appGroup.name]));
  const noteLinksByNoteId = new Map<string, NoteLink[]>();
  const attachmentNames = new Map<string, string[]>();

  data.noteLinks.forEach(link => {
    const links = noteLinksByNoteId.get(link.noteId) ?? [];
    links.push(link);
    noteLinksByNoteId.set(link.noteId, links);
  });

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
    const payeeName = entry.payeeId ? payeeNames.get(entry.payeeId) : undefined;
    if (includesQuery(normalizedQuery, [entry.kind, entry.amountMinor, entry.currency, categoryName, accountName, payeeName, entry.note, entry.occurredAt])) {
      add('money', {
        id: entry.id,
        title: `${entry.kind === 'expense' ? 'Expense' : 'Income'} · ${categoryName ?? 'Uncategorized'}${payeeName ? ` · ${payeeName}` : ''}`,
        detail: `${entry.amountMinor} ${entry.currency}${entry.note ? ` · ${entry.note}` : ''}`,
      });
    }
  });

  data.notes.forEach(note => {
    if (!isVisible(note.isArchived, includeArchived)) {
      return;
    }
    const names = attachmentNames.get(note.id) ?? [];
    const linkInfo = (noteLinksByNoteId.get(note.id) ?? []).map(link => noteLinkSearchInfo(link, {
      accountNames,
      categoryNames,
      payeeNames,
      tasks,
      projects,
      money,
      focusSessions,
      taskTitles,
      projectNames,
      noteTitles,
      appGroupNames,
    }, includeArchived));
    if (includesQuery(normalizedQuery, [note.title, note.body, ...note.tags, ...names, note.updatedAt, ...linkInfo.flatMap(info => info.searchValues)])) {
      add('note', {
        id: note.id,
        title: note.title,
        detail: [note.body, note.tags.join(', '), names.join(', '), ...linkInfo.map(info => info.label)].filter(Boolean).join(' · ') || 'No preview',
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

  data.templates.forEach(template => {
    if (isVisible(template.isArchived, includeArchived) && includesQuery(normalizedQuery, [template.name, template.title, template.details, template.priority])) {
      add('task-template', {
        id: template.id,
        title: template.name,
        detail: `${template.title} · ${template.priority} task template`,
        isArchived: template.isArchived,
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
