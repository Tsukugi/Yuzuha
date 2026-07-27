import type {PropsWithChildren} from 'react';
import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
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
import {createTaskRecord, deleteTaskRecord, updateTaskRecord, validateTaskDraft, type TaskDraft} from '../shared/taskLifecycle';
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
  addTask: (input: TaskDraft) => Promise<void>;
  updateTask: (taskId: string, input: TaskDraft) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
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

export function AppStoreProvider({children, store = defaultWorkspaceStore}: PropsWithChildren<{store?: WorkspaceStore}>) {
  const [data, setData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (!data) {
        throw new Error('App data is not ready.');
      }
      const next = update(data);
      await store.save(next);
      setData(next);
    },
    [data, store],
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
    await commit(() => emptyAppData());
  }, [commit, data?.attachments]);

  const restoreWorkspace = useCallback(async (next: AppData, attachmentStage?: AttachmentRestoreStage) => {
    if (next.attachments.length > 0 && !attachmentStage) {
      throw new Error('Attachment bytes are required to restore a workspace with attachments.');
    }
    try {
      await deleteAttachmentFiles(data?.attachments ?? []);
      await commit(() => next);
      await attachmentStage?.commit();
    } catch (error) {
      await attachmentStage?.discard();
      throw error;
    }
  }, [commit, data?.attachments]);

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
    async (input: TaskDraft) => {
      await commit(current => {
        const listIds = new Set(current.taskLists.map(taskList => taskList.id));
        const validationError = validateTaskDraft(input, listIds);
        if (validationError) {
          throw new Error(validationError);
        }
        const now = new Date().toISOString();
        const task = createTaskRecord(input, createId('task'), now);
        return {...current, tasks: [task, ...current.tasks]};
      });
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
        return {
          ...current,
          tasks: current.tasks.map(item => item.id === taskId ? updateTaskRecord(task, input, new Date().toISOString()) : item),
        };
      });
    },
    [commit],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await commit(current => {
        return {...current, tasks: deleteTaskRecord(current.tasks, taskId)};
      });
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
      await commit(current => {
        const listIds = new Set(current.taskLists.map(taskList => taskList.id));
        const validationError = validateTaskRecurrenceDraft(input, listIds);
        if (validationError) {
          throw new Error(validationError);
        }
        const timestamp = new Date().toISOString();
        const rule = createTaskRecurrenceRecord(input, createId('task_recurrence'), timestamp);
        return expandDueTaskRecurrences(
          {...current, taskRecurrences: [rule, ...current.taskRecurrences]},
          localDateKey(new Date()),
          timestamp,
        ).data;
      });
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
          tasks: [createTaskFromNoteRecord(note, createId('task'), now), ...current.tasks],
        };
      });
    },
    [commit],
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      const now = new Date().toISOString();
      await commit(current => ({
        ...current,
        tasks: current.tasks.map(task =>
          task.id === taskId
            ? {...task, status: task.status === 'open' ? 'completed' : 'open', updatedAt: now}
            : task,
        ),
      }));
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
      deleteTask,
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
      deleteTask,
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
