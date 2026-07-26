import type {PropsWithChildren} from 'react';
import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {createId} from '../shared/id';
import {LocalStore} from './localStore';
import type {
  AppData,
  MoneyAccount,
  MoneyCategory,
  MoneyKind,
  MoneyEntry,
  Note,
  Task,
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
  addMoneyAccount: (name: string, currency: string) => Promise<void>;
  addMoneyCategory: (name: string, kind: MoneyKind | 'both') => Promise<void>;
  archiveMoneyAccount: (accountId: string) => Promise<void>;
  archiveMoneyCategory: (categoryId: string) => Promise<void>;
  addNote: (input: {title: string; body: string}) => Promise<void>;
  addTask: (input: {title: string; details: string}) => Promise<void>;
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
const defaultLocalStore = new LocalStore();

export function AppStoreProvider({children, store = defaultLocalStore}: PropsWithChildren<{store?: LocalStore}>) {
  const [data, setData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    store
      .load()
      .then(loaded => {
        if (mounted) {
          setData(loaded);
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
      await commit(current => ({...current, money: current.money.filter(entry => entry.id !== entryId)}));
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
    async (input: {title: string; body: string}) => {
      const now = new Date().toISOString();
      const note: Note = {
        ...input,
        id: createId('note'),
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      };
      await commit(current => ({...current, notes: [note, ...current.notes]}));
    },
    [commit],
  );

  const addTask = useCallback(
    async (input: {title: string; details: string}) => {
      const now = new Date().toISOString();
      const task: Task = {
        ...input,
        id: createId('task'),
        status: 'open',
        dueLocalDate: null,
        createdAt: now,
        updatedAt: now,
      };
      await commit(current => ({...current, tasks: [task, ...current.tasks]}));
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
      addMoneyAccount,
      addMoneyCategory,
      archiveMoneyAccount,
      archiveMoneyCategory,
      addNote,
      addTask,
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
      addNote,
      addTask,
      data,
      error,
      isLoading,
      replaceUsageSnapshots,
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
