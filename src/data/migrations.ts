import {emptyAppData} from '../types/domain';
import type {AppData, MoneyBudget, MoneyCategory, MoneyEntry, UsageRead, UsageSnapshot} from '../types/domain';

interface StoredV1 {
  schemaVersion: 1;
  money: Array<Omit<MoneyEntry, 'accountId' | 'categoryId'> & {category: string}>;
  notes: AppData['notes'];
  tasks: AppData['tasks'];
}

interface StoredV2 {
  schemaVersion: 2;
  mainCurrency: string;
  money: MoneyEntry[];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: AppData['tasks'];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
}

interface StoredV3 {
  schemaVersion: 3;
  mainCurrency: string;
  money: MoneyEntry[];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: AppData['tasks'];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV4 {
  schemaVersion: 4;
  mainCurrency: string;
  money: MoneyEntry[];
  transfers: AppData['transfers'];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: AppData['tasks'];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV5 {
  schemaVersion: 5;
  mainCurrency: string;
  money: MoneyEntry[];
  transfers: AppData['transfers'];
  splits: AppData['splits'];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: AppData['tasks'];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV6 {
  schemaVersion: 6;
  mainCurrency: string;
  money: AppData['money'];
  transfers: AppData['transfers'];
  splits: AppData['splits'];
  budgets: Array<Omit<MoneyBudget, 'rollover'>>;
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: AppData['tasks'];
  usageSnapshots: AppData['usageSnapshots'];
  usageRead: AppData['usageRead'];
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isStoredV1(value: unknown): value is StoredV1 {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    Array.isArray(value.money) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks)
  );
}

export function isStoredV2(value: unknown): value is StoredV2 {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead)
  );
}

export function isStoredV3(value: unknown): value is StoredV3 {
  return (
    isRecord(value) &&
    value.schemaVersion === 3 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV4(value: unknown): value is StoredV4 {
  return (
    isRecord(value) &&
    value.schemaVersion === 4 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV5(value: unknown): value is StoredV5 {
  return (
    isRecord(value) &&
    value.schemaVersion === 5 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV6(value: unknown): value is StoredV6 {
  return (
    isRecord(value) &&
    value.schemaVersion === 6 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV7(value: unknown): value is AppData {
  return (
    isRecord(value) &&
    value.schemaVersion === 7 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    value.budgets.every(budget => isRecord(budget) && (budget.rollover === 'none' || budget.rollover === 'carry-forward')) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

function legacyCategoryId(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `category_${slug || 'uncategorized'}`;
}

export function migrateV1ToV2(value: StoredV1): StoredV2 {
  const next = emptyAppData();
  const categories = new Map(next.categories.map(category => [category.name.toLowerCase(), category]));
  const migratedMoney: MoneyEntry[] = value.money.map(entry => {
    const name = entry.category.trim() || 'Uncategorized';
    const key = name.toLowerCase();
    let category = categories.get(key);
    if (!category) {
      category = {
        id: legacyCategoryId(name),
        name,
        kind: entry.kind,
        isArchived: false,
      };
      categories.set(key, category);
    }
    return {
      ...entry,
      accountId: 'account_everyday',
      categoryId: category.id,
    };
  });

  return {
    schemaVersion: 2,
    mainCurrency: next.mainCurrency,
    money: migratedMoney,
    accounts: next.accounts,
    categories: [...categories.values()] as MoneyCategory[],
    notes: value.notes,
    tasks: value.tasks,
    usageSnapshots: [],
    usageRead: next.usageRead,
  };
}

export function migrateV2ToV3(value: StoredV2): StoredV3 {
  return {
    ...value,
    schemaVersion: 3,
    usageExcludedPackages: [],
    timeGoals: [],
  };
}

export function migrateV3ToV4(value: StoredV3): StoredV4 {
  return {
    ...value,
    schemaVersion: 4,
    transfers: [],
  };
}

export function migrateV4ToV5(value: StoredV4): StoredV5 {
  return {
    ...value,
    schemaVersion: 5,
    splits: [],
  };
}

export function migrateV5ToV6(value: StoredV5): StoredV6 {
  return {
    ...value,
    schemaVersion: 6,
    budgets: [],
  };
}

export function migrateV6ToV7(value: StoredV6): AppData {
  return {
    ...value,
    schemaVersion: 7,
    budgets: value.budgets.map(budget => ({...budget, rollover: 'none'})),
  };
}

export function migrateStoredData(value: unknown): AppData | null {
  if (isStoredV7(value)) {
    return value;
  }
  if (isStoredV6(value)) {
    return migrateV6ToV7(value);
  }
  if (isStoredV5(value)) {
    return migrateV6ToV7(migrateV5ToV6(value));
  }
  if (isStoredV4(value)) {
    return migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(value)));
  }
  if (isStoredV3(value)) {
    return migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(value))));
  }
  if (isStoredV2(value)) {
    return migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(value)))));
  }
  if (isStoredV1(value)) {
    return migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(value))))));
  }
  return null;
}
