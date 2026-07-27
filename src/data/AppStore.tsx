import type {PropsWithChildren} from 'react';
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {createId} from '../shared/id';
import {type MoneyBudgetInput, validateMoneyBudget} from '../shared/moneyBudget';
import {createMoneySplit, type MoneySplitInput, validateMoneySplit} from '../shared/moneySplit';
import {validateMoneyTransfer} from '../shared/moneyTransfer';
import {
  createMoneyRecurrence,
  expandDueMoneyRecurrences,
  type MoneyRecurrenceInput,
  validateMoneyRecurrence,
} from '../shared/moneyRecurrence';
import {localDateKey} from '../shared/period';
import {ATTACHMENT_MAX_PER_NOTE} from '../shared/attachment';
import {deleteAttachmentFiles} from '../shared/attachmentFiles';
import type {AttachmentRestoreStage} from '../shared/attachmentBackup';
import {updateNoteRecord, validateNoteDraft, type NoteDraft} from '../shared/noteLifecycle';
import {createTaskFromNote as createTaskFromNoteRecord} from '../shared/noteTask';
import {createTaskRecord, deleteTaskRecord, moveTaskRecord, nextTaskSortOrder, TASK_INBOX_LIST_ID, updateTaskRecord, validateTaskDraft, type TaskDraft} from '../shared/taskLifecycle';
import {createTaskListRecord, deleteTaskListRecord, setTaskListArchived, updateTaskListRecord, validateTaskListDraft, type TaskListDraft} from '../shared/taskListLifecycle';
import {
  createTaskRecurrenceRecord,
  deleteTaskRecurrenceRecord,
  expandDueTaskRecurrences,
  setTaskRecurrencePaused,
  validateTaskRecurrenceDraft,
  type TaskRecurrenceDraft,
} from '../shared/taskRecurrence';
import {createSavedSearch, validateSavedSearchDraft, type SavedSearchDraft} from '../shared/savedSearch';
import {validateTaskReminderTimestamp} from '../shared/taskReminder';
import {createTaskDependencyRecord, deleteTaskDependencyRecord, getBlockingTaskIds, validateTaskDependencyDraft} from '../shared/taskDependency';
import {adjustTaskReminderForQuietHours, isValidTaskReminderSnoozeDuration, validateQuietHoursDraft} from '../shared/notificationSettings';
import {taskReminders} from '../platform/taskReminders';
import {createNativeWorkspaceStore} from './nativeWorkspaceStore';
import type {WorkspaceStore} from './sqliteStore';
import {emptyAppData} from '../types/domain';
import type {
  AppData,
  MoneyAccount,
  MoneyCategory,
  MoneyKind,
  MoneyEntry,
  MoneyTransfer,
  Note,
  Attachment,
  UsagePermissionState,
  UsageSnapshot,
} from '../types/domain';

interface AppStoreValue {
  data: AppData | null;
  isLoading: boolean;
  error: string | null;
  addMoney: (input: {
    kind: MoneyKind;
    amountMinor: number;
    currency: string;
    accountId: string | null;
    categoryId: string | null;
    category: string;
    note: string;
  }) => Promise<void>;
  updateMoney: (entryId: string, input: {
    kind: MoneyKind;
    amountMinor: number;
    currency: string;
    accountId: string | null;
    categoryId: string | null;
    category: string;
    note: string;
  }) => Promise<void>;
  deleteMoney: (entryId: string) => Promise<void>;
  resetWorkspace: () => Promise<void>;
  restoreWorkspace: (next: AppData, attachmentStage?: AttachmentRestoreStage) => Promise<void>;
  addMoneyRecurrence: (input: MoneyRecurrenceInput) => Promise<void>;
  deleteMoneyRecurrence: (ruleId: string) => Promise<void>;
  addSplitMoney: (input: MoneySplitInput) => Promise<void>;
  addMoneyBudget: (input: MoneyBudgetInput) => Promise<void>;
  deleteMoneyBudget: (budgetId: string) => Promise<void>;
  addMoneyTransfer: (input: {
    fromAccountId: string;
    toAccountId: string;
    amountMinor: number;
    currency: string;
    note: string;
  }) => Promise<void>;
  deleteMoneyTransfer: (transferId: string) => Promise<void>;
  addMoneyAccount: (name: string, currency: string) => Promise<void>;
  addMoneyCategory: (name: string, kind: MoneyKind | 'both') => Promise<void>;
  archiveMoneyAccount: (accountId: string) => Promise<void>;
  archiveMoneyCategory: (categoryId: string) => Promise<void>;
  addNote: (input: NoteDraft) => Promise<void>;
  updateNote: (noteId: string, input: NoteDraft) => Promise<void>;
  toggleNotePinned: (noteId: string) => Promise<void>;
  setNoteArchived: (noteId: string, isArchived: boolean) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  addSavedSearch: (input: SavedSearchDraft) => Promise<void>;
  deleteSavedSearch: (savedSearchId: string) => Promise<void>;
  addAttachment: (noteId: string, attachment: Attachment) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  addTask: (input: TaskDraft) => Promise<string>;
  updateTask: (taskId: string, input: TaskDraft) => Promise<void>;
  moveTask: (taskId: string, direction: 'up' | 'down') => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setTaskReminder: (taskId: string, triggerAtMillis: number) => Promise<void>;
  deleteTaskReminder: (taskId: string) => Promise<void>;
  completeTaskFromReminder: (taskId: string) => Promise<void>;
  snoozeTaskFromReminder: (taskId: string) => Promise<void>;
  addTaskDependency: (sourceTaskId: string, dependentTaskId: string) => Promise<void>;
  deleteTaskDependency: (dependencyId: string) => Promise<void>;
  setNotificationQuietHours: (startLocalTime: string, endLocalTime: string, snoozeDurationMinutes?: number, taskRemindersEnabled?: boolean, recurringTaskRemindersEnabled?: boolean) => Promise<void>;
  addTaskList: (input: TaskListDraft) => Promise<void>;
  updateTaskList: (listId: string, input: TaskListDraft) => Promise<void>;
  setTaskListArchived: (listId: string, isArchived: boolean) => Promise<void>;
  deleteTaskList: (listId: string) => Promise<void>;
  addTaskRecurrence: (input: TaskRecurrenceDraft) => Promise<void>;
  setTaskRecurrencePaused: (ruleId: string, isPaused: boolean) => Promise<void>;
  deleteTaskRecurrence: (ruleId: string) => Promise<void>;
  createTaskFromNote: (noteId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  setUsagePermission: (permission: UsagePermissionState, errorCode?: string | null) => Promise<void>;
  toggleUsageExclusion: (packageName: string) => Promise<void>;
  addTimeGoal: (input: {name: string; period: 'day' | 'week'; targetSeconds: number}) => Promise<void>;
  replaceUsageSnapshots: (input: {
    snapshots: UsageSnapshot[];
    localDates: Set<string>;
    rangeStartMillis: number;
    rangeEndMillis: number;
  }) => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);
const defaultWorkspaceStore = createNativeWorkspaceStore();

function canScheduleTaskReminder(workspace: AppData, task: AppData['tasks'][number]): boolean {
  return workspace.notificationSettings.taskRemindersEnabled &&
    (task.recurrenceRuleId === null || workspace.notificationSettings.recurringTaskRemindersEnabled);
}

function activeTaskReminderEntries(workspace: AppData): Array<{taskId: string; triggerAtMillis: number}> {
  const now = Date.now();
  return workspace.tasks
    .filter(task => canScheduleTaskReminder(workspace, task) && task.status === 'open' && task.reminderAtMillis !== null && task.reminderAtMillis > now)
    .map(task => ({taskId: task.id, triggerAtMillis: adjustTaskReminderForQuietHours(task.reminderAtMillis as number, workspace.notificationSettings)}))
    .filter(reminder => reminder.triggerAtMillis > now);
}

export function AppStoreProvider({children, store = defaultWorkspaceStore}: PropsWithChildren<{store?: WorkspaceStore}>) {
  const [data, setData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  useEffect(() => {
    let mounted = true;
    store
      .load()
      .then(async loaded => {
        const todayLocalDate = localDateKey(new Date());
        const moneyExpanded = expandDueMoneyRecurrences(loaded, todayLocalDate);
        const taskExpanded = expandDueTaskRecurrences(moneyExpanded.data, todayLocalDate);
        if (taskExpanded.data !== loaded) {
          await store.save(taskExpanded.data);
        }
        await taskReminders.sync(activeTaskReminderEntries(taskExpanded.data));
        if (mounted) {
          setData(taskExpanded.data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Saved data could not be opened. Export or repair is required before continuing.');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [store]);

  const commit = useCallback(
    async (update: (current: AppData) => AppData) => {
      const current = dataRef.current;
      if (!current) {
        throw new Error('App data is not ready.');
      }
      const next = update(current);
      await store.save(next);
      dataRef.current = next;
      setData(next);
    },
    [store],
  );

  const addMoney = useCallback(
    async (input: {
      kind: MoneyKind;
      amountMinor: number;
      currency: string;
      accountId: string | null;
      categoryId: string | null;
      category: string;
      note: string;
    }) => {
      const now = new Date().toISOString();
      const entry: MoneyEntry = {
        ...input,
        id: createId('money'),
        occurredAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await commit(current => ({...current, money: [entry, ...current.money]}));
    },
    [commit],
  );

  const updateMoney = useCallback(
    async (entryId: string, input: {
      kind: MoneyKind;
      amountMinor: number;
      currency: string;
      accountId: string | null;
      categoryId: string | null;
      category: string;
      note: string;
    }) => {
      const updatedAt = new Date().toISOString();
      await commit(current => ({
        ...current,
        money: current.money.map(entry => (entry.id === entryId ? {...entry, ...input, updatedAt} : entry)),
      }));
    },
    [commit],
  );

  const deleteMoney = useCallback(
    async (entryId: string) => {
      await commit(current => ({
        ...current,
        money: current.money.filter(entry => entry.id !== entryId),
        splits: current.splits.filter(split => split.parentEntryId !== entryId),
      }));
    },
    [commit],
  );

  const resetWorkspace = useCallback(async () => {
    await deleteAttachmentFiles(data?.attachments ?? []);
    await taskReminders.sync([]);
    await commit(() => emptyAppData());
  }, [commit, data?.attachments]);

  const restoreWorkspace = useCallback(async (next: AppData, attachmentStage?: AttachmentRestoreStage) => {
    if (next.attachments.length > 0 && !attachmentStage) {
      throw new Error('Attachment bytes are required to restore a workspace with attachments.');
    }
    try {
      await taskReminders.sync(activeTaskReminderEntries(next));
      await deleteAttachmentFiles(data?.attachments ?? []);
      await commit(() => next);
      await attachmentStage?.commit();
    } catch (error) {
      await taskReminders.sync(activeTaskReminderEntries(data ?? emptyAppData()));
      await attachmentStage?.discard();
      throw error;
    }
  }, [commit, data]);

  const setNotificationQuietHours = useCallback(
    async (startLocalTime: string, endLocalTime: string, snoozeDurationMinutes?: number, taskRemindersEnabled?: boolean, recurringTaskRemindersEnabled?: boolean) => {
      const current = dataRef.current;
      if (!current) {
        throw new Error('App data is not ready.');
      }
      const validationError = validateQuietHoursDraft(startLocalTime, endLocalTime);
      if (validationError) {
        throw new Error(validationError);
      }
      const nextSnoozeDurationMinutes = snoozeDurationMinutes ?? current.notificationSettings.snoozeDurationMinutes;
      if (!isValidTaskReminderSnoozeDuration(nextSnoozeDurationMinutes)) {
        throw new Error('Choose a valid snooze duration.');
      }
      const nextTaskRemindersEnabled = taskRemindersEnabled ?? current.notificationSettings.taskRemindersEnabled;
      if (typeof nextTaskRemindersEnabled !== 'boolean') {
        throw new Error('Choose whether task reminders are enabled.');
      }
      const nextRecurringTaskRemindersEnabled = recurringTaskRemindersEnabled ?? current.notificationSettings.recurringTaskRemindersEnabled;
      if (typeof nextRecurringTaskRemindersEnabled !== 'boolean') {
        throw new Error('Choose whether recurring task reminders are enabled.');
      }
      const next: AppData = {
        ...current,
        notificationSettings: {
          quietHoursStartLocalTime: startLocalTime.trim() || null,
          quietHoursEndLocalTime: endLocalTime.trim() || null,
          snoozeDurationMinutes: nextSnoozeDurationMinutes,
          taskRemindersEnabled: nextTaskRemindersEnabled,
          recurringTaskRemindersEnabled: nextRecurringTaskRemindersEnabled,
        },
      };
      await taskReminders.sync(activeTaskReminderEntries(next));
      try {
        await commit(() => next);
      } catch (error) {
        await taskReminders.sync(activeTaskReminderEntries(current));
        throw error;
      }
    },
    [commit],
  );

  const addMoneyRecurrence = useCallback(
    async (input: MoneyRecurrenceInput) => {
      const validationError = validateMoneyRecurrence(input, data?.accounts ?? [], data?.categories ?? []);
      if (validationError) {
        throw new Error(validationError);
      }
      const timestamp = new Date().toISOString();
      const rule = createMoneyRecurrence(input, createId('recurrence'), timestamp);
      await commit(current => expandDueMoneyRecurrences(
        {...current, recurrences: [rule, ...current.recurrences]},
        localDateKey(new Date()),
        timestamp,
      ).data);
    },
    [commit, data?.accounts, data?.categories],
  );

  const deleteMoneyRecurrence = useCallback(
    async (ruleId: string) => {
      await commit(current => ({
        ...current,
        recurrences: current.recurrences.filter(rule => rule.id !== ruleId),
      }));
    },
    [commit],
  );

  const addSplitMoney = useCallback(
    async (input: MoneySplitInput) => {
      const validationError = validateMoneySplit(input, data?.accounts ?? [], data?.categories ?? []);
      if (validationError) {
        throw new Error(validationError);
      }
      const timestamp = new Date().toISOString();
      const parentEntryId = createId('money');
      const splitId = createId('split');
      const {entry, split} = createMoneySplit(input, parentEntryId, splitId, timestamp, createId);
      await commit(current => ({
        ...current,
        money: [entry, ...current.money],
        splits: [split, ...current.splits],
      }));
    },
    [commit, data?.accounts, data?.categories],
  );

  const addMoneyBudget = useCallback(
    async (input: MoneyBudgetInput) => {
      const validationError = validateMoneyBudget(input, data?.categories ?? []);
      if (validationError) {
        throw new Error(validationError);
      }
      const timestamp = new Date().toISOString();
      await commit(current => ({
        ...current,
        budgets: [
          {
            ...input,
            id: createId('budget'),
            isArchived: false,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          ...current.budgets,
        ],
      }));
    },
    [commit, data?.categories],
  );

  const deleteMoneyBudget = useCallback(
    async (budgetId: string) => {
      await commit(current => ({...current, budgets: current.budgets.filter(budget => budget.id !== budgetId)}));
    },
    [commit],
  );

  const addMoneyTransfer = useCallback(
    async (input: {
      fromAccountId: string;
      toAccountId: string;
      amountMinor: number;
      currency: string;
      note: string;
    }) => {
      const validationError = validateMoneyTransfer(input, data?.accounts ?? []);
      if (validationError) {
        throw new Error(validationError);
      }
      const now = new Date().toISOString();
      const transfer: MoneyTransfer = {
        ...input,
        id: createId('transfer'),
        occurredAt: now,
        createdAt: now,
        updatedAt: now,
      };
      await commit(current => ({...current, transfers: [transfer, ...current.transfers]}));
    },
    [commit, data?.accounts],
  );

  const deleteMoneyTransfer = useCallback(
    async (transferId: string) => {
      await commit(current => ({...current, transfers: current.transfers.filter(transfer => transfer.id !== transferId)}));
    },
    [commit],
  );

  const addMoneyAccount = useCallback(
    async (name: string, currency: string) => {
      const account: MoneyAccount = {
        id: createId('account'),
        name,
        currency,
        openingBalanceMinor: 0,
        isArchived: false,
      };
      await commit(current => ({...current, accounts: [...current.accounts, account]}));
    },
    [commit],
  );

  const addMoneyCategory = useCallback(
    async (name: string, kind: MoneyKind | 'both') => {
      const category: MoneyCategory = {
        id: createId('category'),
        name,
        kind,
        isArchived: false,
      };
      await commit(current => ({...current, categories: [...current.categories, category]}));
    },
    [commit],
  );

  const archiveMoneyAccount = useCallback(
    async (accountId: string) => {
      await commit(current => ({
        ...current,
        accounts: current.accounts.map(account =>
          account.id === accountId ? {...account, isArchived: true} : account,
        ),
      }));
    },
    [commit],
  );

  const archiveMoneyCategory = useCallback(
    async (categoryId: string) => {
      await commit(current => ({
        ...current,
        categories: current.categories.map(category =>
          category.id === categoryId ? {...category, isArchived: true} : category,
        ),
      }));
    },
    [commit],
  );

  const addNote = useCallback(
    async (input: NoteDraft) => {
      const validationError = validateNoteDraft(input);
      if (validationError) {
        throw new Error(validationError);
      }
      const now = new Date().toISOString();
      const note: Note = {
        ...input,
        id: createId('note'),
        isPinned: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };
      await commit(current => ({...current, notes: [note, ...current.notes]}));
    },
    [commit],
  );

  const updateNote = useCallback(
    async (noteId: string, input: NoteDraft) => {
      const validationError = validateNoteDraft(input);
      if (validationError) {
        throw new Error(validationError);
      }
      const updatedAt = new Date().toISOString();
      await commit(current => {
        const note = current.notes.find(item => item.id === noteId);
        if (!note) {
          throw new Error('The note no longer exists.');
        }
        return {...current, notes: current.notes.map(item => item.id === noteId ? updateNoteRecord(note, input, updatedAt) : item)};
      });
    },
    [commit],
  );

  const toggleNotePinned = useCallback(
    async (noteId: string) => {
      const updatedAt = new Date().toISOString();
      await commit(current => {
        if (!current.notes.some(note => note.id === noteId)) {
          throw new Error('The note no longer exists.');
        }
        return {
          ...current,
          notes: current.notes.map(note => note.id === noteId ? {...note, isPinned: !note.isPinned, updatedAt} : note),
        };
      });
    },
    [commit],
  );

  const setNoteArchived = useCallback(
    async (noteId: string, isArchived: boolean) => {
      const updatedAt = new Date().toISOString();
      await commit(current => {
        if (!current.notes.some(note => note.id === noteId)) {
          throw new Error('The note no longer exists.');
        }
        return {
          ...current,
          notes: current.notes.map(note => note.id === noteId ? {...note, isArchived, updatedAt} : note),
        };
      });
    },
    [commit],
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      const noteAttachments = (data?.attachments ?? []).filter(attachment => attachment.noteId === noteId);
      await deleteAttachmentFiles(noteAttachments);
      await commit(current => {
        if (!current.notes.some(note => note.id === noteId)) {
          throw new Error('The note no longer exists.');
        }
        return {
          ...current,
          notes: current.notes.filter(note => note.id !== noteId),
          attachments: current.attachments.filter(attachment => attachment.noteId !== noteId),
        };
      });
    },
    [commit, data?.attachments],
  );

  const addSavedSearch = useCallback(
    async (input: SavedSearchDraft) => {
      const validationError = validateSavedSearchDraft(input);
      if (validationError) {
        throw new Error(validationError);
      }
      const timestamp = new Date().toISOString();
      const savedSearch = createSavedSearch(input, createId('saved_search'), timestamp);
      await commit(current => ({...current, savedSearches: [savedSearch, ...current.savedSearches]}));
    },
    [commit],
  );

  const deleteSavedSearch = useCallback(
    async (savedSearchId: string) => {
      await commit(current => {
        if (!current.savedSearches.some(savedSearch => savedSearch.id === savedSearchId)) {
          throw new Error('The saved search no longer exists.');
        }
        return {...current, savedSearches: current.savedSearches.filter(savedSearch => savedSearch.id !== savedSearchId)};
      });
    },
    [commit],
  );

  const addAttachment = useCallback(
    async (noteId: string, attachment: Attachment) => {
      await commit(current => {
        if (!current.notes.some(note => note.id === noteId)) {
          throw new Error('The note for this attachment no longer exists.');
        }
        if (attachment.noteId !== noteId) {
          throw new Error('The attachment does not belong to this note.');
        }
        if (current.attachments.some(item => item.id === attachment.id)) {
          throw new Error('This attachment already exists.');
        }
        if (current.attachments.filter(item => item.noteId === noteId).length >= ATTACHMENT_MAX_PER_NOTE) {
          throw new Error(`A note can have at most ${ATTACHMENT_MAX_PER_NOTE} attachments.`);
        }
        const updatedAt = new Date().toISOString();
        return {
          ...current,
          attachments: [attachment, ...current.attachments],
          notes: current.notes.map(note => note.id === noteId ? {...note, updatedAt} : note),
        };
      });
    },
    [commit],
  );

  const deleteAttachment = useCallback(
    async (attachmentId: string) => {
      await commit(current => {
        const attachment = current.attachments.find(item => item.id === attachmentId);
        if (!attachment) {
          throw new Error('The attachment no longer exists.');
        }
        const updatedAt = new Date().toISOString();
        return {
          ...current,
          attachments: current.attachments.filter(item => item.id !== attachmentId),
          notes: current.notes.map(note => note.id === attachment.noteId ? {...note, updatedAt} : note),
        };
      });
    },
    [commit],
  );

  const addTask = useCallback(
    async (input: TaskDraft): Promise<string> => {
      const taskId = createId('task');
      await commit(current => {
        const listIds = new Set(current.taskLists.map(taskList => taskList.id));
        const validationError = validateTaskDraft(input, listIds);
        if (validationError) {
          throw new Error(validationError);
        }
        const now = new Date().toISOString();
        const task = createTaskRecord(input, taskId, now, null, nextTaskSortOrder(current.tasks, input.listId));
        return {...current, tasks: [task, ...current.tasks]};
      });
      return taskId;
    },
    [commit],
  );

  const updateTask = useCallback(
    async (taskId: string, input: TaskDraft) => {
      await commit(current => {
        const task = current.tasks.find(item => item.id === taskId);
        if (!task) {
          throw new Error('The task no longer exists.');
        }
        const listIds = new Set(current.taskLists.map(taskList => taskList.id));
        const validationError = validateTaskDraft(input, listIds);
        if (validationError) {
          throw new Error(validationError);
        }
        const updatedTask = updateTaskRecord(task, input, new Date().toISOString());
        return {
          ...current,
          tasks: current.tasks.map(item => item.id === taskId
            ? {...updatedTask, sortOrder: input.listId === task.listId ? task.sortOrder : nextTaskSortOrder(current.tasks, input.listId)}
            : item),
        };
      });
    },
    [commit],
  );

  const moveTask = useCallback(
    async (taskId: string, direction: 'up' | 'down') => {
      await commit(current => {
        const moved = moveTaskRecord(current.tasks, taskId, direction);
        if (moved === current.tasks) {
          return current;
        }
        const changedTaskIds = new Set(moved.filter((task, index) => task.sortOrder !== current.tasks[index]?.sortOrder).map(task => task.id));
        const updatedAt = new Date().toISOString();
        return {
          ...current,
          tasks: moved.map(task => changedTaskIds.has(task.id) ? {...task, updatedAt} : task),
        };
      });
    },
    [commit],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const task = dataRef.current?.tasks.find(item => item.id === taskId);
      if (!task) {
        throw new Error('The task no longer exists.');
      }
      const current = dataRef.current;
      const notificationSettings = current?.notificationSettings ?? emptyAppData().notificationSettings;
      const previousReminderAtMillis = task.reminderAtMillis;
      if (previousReminderAtMillis !== null) {
        await taskReminders.cancel(taskId);
      }
      try {
        await commit(current => ({
          ...current,
          tasks: deleteTaskRecord(current.tasks, taskId),
          taskDependencies: current.taskDependencies.filter(dependency => dependency.sourceTaskId !== taskId && dependency.dependentTaskId !== taskId),
        }));
      } catch (error) {
        if (current && previousReminderAtMillis !== null && previousReminderAtMillis > Date.now() && canScheduleTaskReminder(current, task)) {
          await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(previousReminderAtMillis, notificationSettings));
        }
        throw error;
      }
    },
    [commit],
  );

  const setTaskReminder = useCallback(
    async (taskId: string, triggerAtMillis: number) => {
      const current = dataRef.current;
      const task = current?.tasks.find(item => item.id === taskId);
      if (!current || !task) {
        throw new Error('The task no longer exists.');
      }
      if (task.status === 'completed') {
        throw new Error('Complete tasks cannot have an active reminder.');
      }
      const validationError = validateTaskReminderTimestamp(triggerAtMillis);
      if (validationError) {
        throw new Error(validationError);
      }
      const previousReminderAtMillis = task.reminderAtMillis;
      if (canScheduleTaskReminder(current, task)) {
        await taskReminders.requestPermission();
        await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(triggerAtMillis, current.notificationSettings));
      }
      try {
        await commit(current => ({
          ...current,
          tasks: current.tasks.map(item => item.id === taskId ? {...item, reminderAtMillis: triggerAtMillis, updatedAt: new Date().toISOString()} : item),
        }));
      } catch (error) {
        if (!canScheduleTaskReminder(current, task)) {
          throw error;
        }
        if (previousReminderAtMillis !== null && previousReminderAtMillis > Date.now() && canScheduleTaskReminder(current, task)) {
          await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(previousReminderAtMillis, current.notificationSettings));
        } else {
          await taskReminders.cancel(taskId);
        }
        throw error;
      }
    },
    [commit],
  );

  const deleteTaskReminder = useCallback(
    async (taskId: string) => {
      const current = dataRef.current;
      const task = current?.tasks.find(item => item.id === taskId);
      if (!current || !task) {
        throw new Error('The task no longer exists.');
      }
      if (task.reminderAtMillis === null) {
        return;
      }
      const previousReminderAtMillis = task.reminderAtMillis;
      await taskReminders.cancel(taskId);
      try {
        await commit(current => ({
          ...current,
          tasks: current.tasks.map(item => item.id === taskId ? {...item, reminderAtMillis: null, updatedAt: new Date().toISOString()} : item),
        }));
      } catch (error) {
        if (previousReminderAtMillis > Date.now() && canScheduleTaskReminder(current, task)) {
          await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(previousReminderAtMillis, current.notificationSettings));
        }
        throw error;
      }
    },
    [commit],
  );

  const completeTaskFromReminder = useCallback(
    async (taskId: string) => {
      const current = dataRef.current;
      const task = current?.tasks.find(item => item.id === taskId);
      if (!current || !task || task.status === 'completed') {
        return;
      }
      if (getBlockingTaskIds(taskId, current.tasks, current.taskDependencies).length > 0) {
        return;
      }
      const reminderAtMillis = task.reminderAtMillis;
      if (reminderAtMillis !== null) {
        await taskReminders.cancel(taskId);
      }
      try {
        await commit(workspace => ({
          ...workspace,
          tasks: workspace.tasks.map(item => item.id === taskId ? {...item, status: 'completed', updatedAt: new Date().toISOString()} : item),
        }));
      } catch (error) {
        if (reminderAtMillis !== null && reminderAtMillis > Date.now() && canScheduleTaskReminder(current, task)) {
          await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(reminderAtMillis, current.notificationSettings));
        }
        throw error;
      }
    },
    [commit],
  );

  const addTaskDependency = useCallback(
    async (sourceTaskId: string, dependentTaskId: string) => {
      const current = dataRef.current;
      if (!current) {
        throw new Error('App data is not ready.');
      }
      const draft = {sourceTaskId, dependentTaskId};
      const validationError = validateTaskDependencyDraft(draft, current.tasks, current.taskDependencies);
      if (validationError) {
        throw new Error(validationError);
      }
      const timestamp = new Date().toISOString();
      const dependency = createTaskDependencyRecord(draft, createId('task_dependency'), timestamp);
      await commit(workspace => ({...workspace, taskDependencies: [dependency, ...workspace.taskDependencies]}));
    },
    [commit],
  );

  const deleteTaskDependency = useCallback(
    async (dependencyId: string) => {
      await commit(current => ({...current, taskDependencies: deleteTaskDependencyRecord(current.taskDependencies, dependencyId)}));
    },
    [commit],
  );

  const snoozeTaskFromReminder = useCallback(
    async (taskId: string) => {
      const current = dataRef.current;
      const task = current?.tasks.find(item => item.id === taskId);
      if (!current || !task || task.status === 'completed') {
        return;
      }
      if (!canScheduleTaskReminder(current, task)) {
        return;
      }
      const previousReminderAtMillis = task.reminderAtMillis;
      const snoozedReminderAtMillis = Date.now() + current.notificationSettings.snoozeDurationMinutes * 60 * 1000;
      if (previousReminderAtMillis !== null) {
        await taskReminders.cancel(taskId);
      }
      try {
        await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(snoozedReminderAtMillis, current.notificationSettings));
        await commit(workspace => ({
          ...workspace,
          tasks: workspace.tasks.map(item => item.id === taskId ? {...item, reminderAtMillis: snoozedReminderAtMillis, updatedAt: new Date().toISOString()} : item),
        }));
      } catch (error) {
        if (previousReminderAtMillis !== null && previousReminderAtMillis > Date.now()) {
          await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(previousReminderAtMillis, current.notificationSettings));
        } else {
          await taskReminders.cancel(taskId);
        }
        throw error;
      }
    },
    [commit],
  );

  const addTaskList = useCallback(
    async (input: TaskListDraft) => {
      await commit(current => {
        const list = createTaskListRecord(input, createId('task_list'), new Date().toISOString(), current.taskLists);
        return {...current, taskLists: [...current.taskLists, list]};
      });
    },
    [commit],
  );

  const updateTaskList = useCallback(
    async (listId: string, input: TaskListDraft) => {
      await commit(current => {
        const list = current.taskLists.find(item => item.id === listId);
        if (!list) {
          throw new Error('The task list no longer exists.');
        }
        const validationError = validateTaskListDraft(input, current.taskLists, listId);
        if (validationError) {
          throw new Error(validationError);
        }
        return {
          ...current,
          taskLists: current.taskLists.map(item => item.id === listId ? updateTaskListRecord(list, input, new Date().toISOString(), current.taskLists) : item),
        };
      });
    },
    [commit],
  );

  const setTaskListArchivedAction = useCallback(
    async (listId: string, isArchived: boolean) => {
      await commit(current => ({...current, taskLists: setTaskListArchived(current.taskLists, listId, isArchived)}));
    },
    [commit],
  );

  const deleteTaskList = useCallback(
    async (listId: string) => {
      await commit(current => ({...current, taskLists: deleteTaskListRecord(current.taskLists, current.tasks, listId, current.taskRecurrences)}));
    },
    [commit],
  );

  const addTaskRecurrence = useCallback(
    async (input: TaskRecurrenceDraft) => {
      const current = dataRef.current;
      if (!current) {
        throw new Error('App data is not ready.');
      }
      const listIds = new Set(current.taskLists.map(taskList => taskList.id));
      const validationError = validateTaskRecurrenceDraft(input, listIds);
      if (validationError) {
        throw new Error(validationError);
      }
      const timestamp = new Date().toISOString();
      const rule = createTaskRecurrenceRecord(input, createId('task_recurrence'), timestamp);
      const next = expandDueTaskRecurrences(
        {...current, taskRecurrences: [rule, ...current.taskRecurrences]},
        localDateKey(new Date()),
        timestamp,
      ).data;
      await taskReminders.sync(activeTaskReminderEntries(next));
      try {
        await commit(() => next);
      } catch (error) {
        await taskReminders.sync(activeTaskReminderEntries(current));
        throw error;
      }
    },
    [commit],
  );

  const setTaskRecurrencePausedAction = useCallback(
    async (ruleId: string, isPaused: boolean) => {
      await commit(current => ({
        ...current,
        taskRecurrences: setTaskRecurrencePaused(current.taskRecurrences, ruleId, isPaused),
      }));
    },
    [commit],
  );

  const deleteTaskRecurrence = useCallback(
    async (ruleId: string) => {
      await commit(current => ({
        ...current,
        ...deleteTaskRecurrenceRecord(current.taskRecurrences, current.tasks, ruleId),
      }));
    },
    [commit],
  );

  const createTaskFromNote = useCallback(
    async (noteId: string) => {
      const now = new Date().toISOString();
      await commit(current => {
        const note = current.notes.find(item => item.id === noteId);
        if (!note) {
          throw new Error('The note no longer exists.');
        }
        return {
          ...current,
          tasks: [createTaskFromNoteRecord(note, createId('task'), now, nextTaskSortOrder(current.tasks, TASK_INBOX_LIST_ID)), ...current.tasks],
        };
      });
    },
    [commit],
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      const current = dataRef.current;
      const task = current?.tasks.find(item => item.id === taskId);
      if (!current || !task) {
        throw new Error('The task no longer exists.');
      }
      const now = new Date().toISOString();
      const completing = task.status === 'open';
      const reminderAtMillis = task.reminderAtMillis;
      if (completing && getBlockingTaskIds(taskId, current.tasks, current.taskDependencies).length > 0) {
        throw new Error('Task is blocked by an incomplete dependency.');
      }
      if (completing && reminderAtMillis !== null) {
        await taskReminders.cancel(taskId);
      } else if (!completing && reminderAtMillis !== null && reminderAtMillis > Date.now() && canScheduleTaskReminder(current, task)) {
        await taskReminders.requestPermission();
        await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(reminderAtMillis, current.notificationSettings));
      }
      try {
        await commit(current => ({
          ...current,
          tasks: current.tasks.map(item =>
            item.id === taskId
              ? {...item, status: completing ? 'completed' : 'open', updatedAt: now}
              : item,
          ),
        }));
      } catch (error) {
        if (reminderAtMillis !== null && reminderAtMillis > Date.now()) {
          if (completing && canScheduleTaskReminder(current, task)) {
            await taskReminders.schedule(taskId, adjustTaskReminderForQuietHours(reminderAtMillis, current.notificationSettings));
          } else {
            await taskReminders.cancel(taskId);
          }
        }
        throw error;
      }
    },
    [commit],
  );

  const setUsagePermission = useCallback(
    async (permission: UsagePermissionState, errorCode: string | null = null) => {
      await commit(current => ({
        ...current,
        usageRead: {...current.usageRead, permission, errorCode},
      }));
    },
    [commit],
  );

  const toggleUsageExclusion = useCallback(
    async (packageName: string) => {
      await commit(current => {
        const isExcluded = current.usageExcludedPackages.includes(packageName);
        const usageExcludedPackages = isExcluded
          ? current.usageExcludedPackages.filter(item => item !== packageName)
          : [...current.usageExcludedPackages, packageName];
        return {
          ...current,
          usageExcludedPackages,
          usageSnapshots: current.usageSnapshots.map(snapshot =>
            snapshot.packageName === packageName ? {...snapshot, included: isExcluded} : snapshot,
          ),
        };
      });
    },
    [commit],
  );

  const addTimeGoal = useCallback(
    async (input: {name: string; period: 'day' | 'week'; targetSeconds: number}) => {
      await commit(current => ({
        ...current,
        timeGoals: [...current.timeGoals, {...input, id: createId('time_goal'), isArchived: false}],
      }));
    },
    [commit],
  );

  const replaceUsageSnapshots = useCallback(
    async ({snapshots, localDates, rangeStartMillis, rangeEndMillis}: {
      snapshots: UsageSnapshot[];
      localDates: Set<string>;
      rangeStartMillis: number;
      rangeEndMillis: number;
    }) => {
      const readAt = new Date().toISOString();
      await commit(current => ({
        ...current,
        usageSnapshots: [
          ...current.usageSnapshots.filter(snapshot => !localDates.has(snapshot.localDate)),
          ...snapshots.map(snapshot => ({
            ...snapshot,
            sourceReadAt: readAt,
            included: !current.usageExcludedPackages.includes(snapshot.packageName),
          })),
        ],
        usageRead: {
          permission: 'granted',
          lastReadAt: readAt,
          rangeStartMillis,
          rangeEndMillis,
          errorCode: null,
        },
      }));
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      data,
      isLoading,
      error,
      addMoney,
      updateMoney,
      deleteMoney,
      resetWorkspace,
      restoreWorkspace,
      addMoneyRecurrence,
      deleteMoneyRecurrence,
      addSplitMoney,
      addMoneyBudget,
      deleteMoneyBudget,
      addMoneyTransfer,
      deleteMoneyTransfer,
      addMoneyAccount,
      addMoneyCategory,
      archiveMoneyAccount,
      archiveMoneyCategory,
      addNote,
      updateNote,
      toggleNotePinned,
      setNoteArchived,
      deleteNote,
      addSavedSearch,
      deleteSavedSearch,
      addAttachment,
      deleteAttachment,
      addTask,
      updateTask,
      moveTask,
      deleteTask,
      setTaskReminder,
      deleteTaskReminder,
      completeTaskFromReminder,
      snoozeTaskFromReminder,
      addTaskDependency,
      deleteTaskDependency,
      setNotificationQuietHours,
      addTaskList,
      updateTaskList,
      setTaskListArchived: setTaskListArchivedAction,
      deleteTaskList,
      addTaskRecurrence,
      setTaskRecurrencePaused: setTaskRecurrencePausedAction,
      deleteTaskRecurrence,
      createTaskFromNote,
      toggleTask,
      setUsagePermission,
      toggleUsageExclusion,
      addTimeGoal,
      replaceUsageSnapshots,
    }),
    [
      addMoney,
      addTimeGoal,
      addMoneyAccount,
      addMoneyCategory,
      archiveMoneyAccount,
      archiveMoneyCategory,
      deleteMoney,
      deleteMoneyTransfer,
      addSplitMoney,
      addMoneyBudget,
      deleteMoneyBudget,
      addNote,
      updateNote,
      toggleNotePinned,
      setNoteArchived,
      deleteNote,
      addSavedSearch,
      deleteSavedSearch,
      addAttachment,
      deleteAttachment,
      addTask,
      updateTask,
      moveTask,
      deleteTask,
      setTaskReminder,
      deleteTaskReminder,
      completeTaskFromReminder,
      snoozeTaskFromReminder,
      addTaskDependency,
      deleteTaskDependency,
      setNotificationQuietHours,
      addTaskList,
      updateTaskList,
      setTaskListArchivedAction,
      deleteTaskList,
      addTaskRecurrence,
      setTaskRecurrencePausedAction,
      deleteTaskRecurrence,
      createTaskFromNote,
      data,
      error,
      isLoading,
      replaceUsageSnapshots,
      resetWorkspace,
      restoreWorkspace,
      addMoneyRecurrence,
      deleteMoneyRecurrence,
      setUsagePermission,
      toggleUsageExclusion,
      toggleTask,
      updateMoney,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext);
  if (!value) {
    throw new Error('useAppStore must be used inside AppStoreProvider.');
  }
  return value;
}
