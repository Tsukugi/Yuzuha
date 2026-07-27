import {emptyAppData} from '../types/domain';
import type {AppData, MoneyBudget, MoneyCategory, MoneyEntry, MoneyRecurrenceRule, UsageRead, UsageSnapshot} from '../types/domain';
import {validateNoteTags} from '../shared/noteSearch';

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

interface StoredV7 {
  schemaVersion: 7;
  mainCurrency: string;
  money: AppData['money'];
  transfers: AppData['transfers'];
  splits: AppData['splits'];
  budgets: AppData['budgets'];
  accounts: AppData['accounts'];
  categories: AppData['categories'];
  notes: AppData['notes'];
  tasks: AppData['tasks'];
  usageSnapshots: AppData['usageSnapshots'];
  usageRead: AppData['usageRead'];
  usageExcludedPackages: string[];
  timeGoals: AppData['timeGoals'];
}

interface StoredV8 extends Omit<AppData, 'schemaVersion' | 'recurrences' | 'attachments'> {
  schemaVersion: 8;
  recurrences: Array<Omit<MoneyRecurrenceRule, 'missedOccurrencePolicy'>>;
}

interface StoredV9 extends Omit<AppData, 'schemaVersion' | 'attachments'> {
  schemaVersion: 9;
}

type StoredNoteV11 = Omit<AppData['notes'][number], 'isArchived'>;

interface StoredV10 extends Omit<AppData, 'schemaVersion' | 'notes'> {
  schemaVersion: 10;
  notes: StoredNoteV11[];
}

interface StoredV11 extends Omit<AppData, 'schemaVersion' | 'notes'> {
  schemaVersion: 11;
  notes: StoredNoteV11[];
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

export function isStoredV7(value: unknown): value is StoredV7 {
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

export function isStoredV8(value: unknown): value is StoredV8 {
  return (
    isRecord(value) &&
    value.schemaVersion === 8 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
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

export function isStoredV9(value: unknown): value is StoredV9 {
  return (
    isRecord(value) &&
    value.schemaVersion === 9 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
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

export function isStoredV10(value: unknown): value is StoredV10 {
  return (
    isRecord(value) &&
    value.schemaVersion === 10 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    Array.isArray(value.attachments) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV11(value: unknown): value is StoredV11 {
  return (
    isRecord(value) &&
    value.schemaVersion === 11 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    value.notes.every(note => isRecord(note) && validateNoteTags(note.tags)) &&
    Array.isArray(value.attachments) &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.usageSnapshots) &&
    isRecord(value.usageRead) &&
    Array.isArray(value.usageExcludedPackages) &&
    Array.isArray(value.timeGoals)
  );
}

export function isStoredV12(value: unknown): value is AppData {
  return (
    isRecord(value) &&
    value.schemaVersion === 12 &&
    typeof value.mainCurrency === 'string' &&
    Array.isArray(value.money) &&
    Array.isArray(value.transfers) &&
    Array.isArray(value.splits) &&
    Array.isArray(value.budgets) &&
    Array.isArray(value.recurrences) &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.notes) &&
    value.notes.every(note => isRecord(note) && validateNoteTags(note.tags) && typeof note.isPinned === 'boolean' && typeof note.isArchived === 'boolean') &&
    Array.isArray(value.attachments) &&
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

export function migrateV6ToV7(value: StoredV6): StoredV7 {
  return {
    ...value,
    schemaVersion: 7,
    budgets: value.budgets.map(budget => ({...budget, rollover: 'none'})),
  };
}

export function migrateV7ToV8(value: StoredV7): StoredV8 {
  return {
    ...value,
    schemaVersion: 8,
    recurrences: [],
  };
}

export function migrateV8ToV9(value: StoredV8): StoredV9 {
  return {
    ...value,
    schemaVersion: 9,
    recurrences: value.recurrences.map(rule => ({...rule, missedOccurrencePolicy: 'all'})),
  };
}

export function migrateV9ToV10(value: StoredV9): StoredV10 {
  return {
    ...value,
    schemaVersion: 10,
    attachments: [],
  };
}

export function migrateV10ToV11(value: StoredV10): StoredV11 {
  return {
    ...value,
    schemaVersion: 11,
    notes: value.notes.map(note => ({...note, tags: []})),
  };
}

export function migrateV11ToV12(value: StoredV11): AppData {
  return {
    ...value,
    schemaVersion: 12,
    notes: value.notes.map(note => ({...note, isArchived: false})),
  };
}

export function migrateStoredData(value: unknown): AppData | null {
  if (isStoredV12(value)) {
    return value;
  }
  if (isStoredV11(value)) {
    return migrateV11ToV12(value);
  }
  if (isStoredV10(value)) {
    return migrateV11ToV12(migrateV10ToV11(value));
  }
  if (isStoredV9(value)) {
    return migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(value)));
  }
  if (isStoredV8(value)) {
    return migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(value))));
  }
  if (isStoredV7(value)) {
    return migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(value)))));
  }
  if (isStoredV6(value)) {
    return migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(value))))));
  }
  if (isStoredV5(value)) {
    return migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(value)))))));
  }
  if (isStoredV4(value)) {
    return migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(value))))))));
  }
  if (isStoredV3(value)) {
    return migrateV11ToV12(migrateV10ToV11(migrateV9ToV10(migrateV8ToV9(migrateV7ToV8(migrateV6ToV7(migrateV5ToV6(migrateV4ToV5(migrateV3ToV4(value)))))))));
  }
  if (isStoredV2(value)) {
    const v3 = migrateV2ToV3(value);
    const v4 = migrateV3ToV4(v3);
    const v5 = migrateV4ToV5(v4);
    const v6 = migrateV5ToV6(v5);
    const v7 = migrateV6ToV7(v6);
    const v8 = migrateV7ToV8(v7);
    const v9 = migrateV8ToV9(v8);
    const v10 = migrateV9ToV10(v9);
    return migrateV11ToV12(migrateV10ToV11(v10));
  }
  if (isStoredV1(value)) {
    const v2 = migrateV1ToV2(value);
    const v3 = migrateV2ToV3(v2);
    const v4 = migrateV3ToV4(v3);
    const v5 = migrateV4ToV5(v4);
    const v6 = migrateV5ToV6(v5);
    const v7 = migrateV6ToV7(v6);
    const v8 = migrateV7ToV8(v7);
    const v9 = migrateV8ToV9(v8);
    const v10 = migrateV9ToV10(v9);
    return migrateV11ToV12(migrateV10ToV11(v10));
  }
  return null;
}
