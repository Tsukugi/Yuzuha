import {emptyAppData} from '../types/domain';
import type {AppData, MoneyCategory, MoneyEntry, UsageRead, UsageSnapshot} from '../types/domain';

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

export function isStoredV3(value: unknown): value is AppData {
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

export function migrateV2ToV3(value: StoredV2): AppData {
  return {
    ...value,
    schemaVersion: 3,
    usageExcludedPackages: [],
    timeGoals: [],
  };
}

export function migrateStoredData(value: unknown): AppData | null {
  if (isStoredV3(value)) {
    return value;
  }
  if (isStoredV2(value)) {
    return migrateV2ToV3(value);
  }
  if (isStoredV1(value)) {
    return migrateV2ToV3(migrateV1ToV2(value));
  }
  return null;
}
