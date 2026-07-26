export type MoneyKind = 'income' | 'expense';

export interface MoneyAccount {
  id: string;
  name: string;
  currency: string;
  openingBalanceMinor: number;
  isArchived: boolean;
}

export interface MoneyCategory {
  id: string;
  name: string;
  kind: MoneyKind | 'both';
  isArchived: boolean;
}

export interface MoneyEntry {
  id: string;
  kind: MoneyKind;
  amountMinor: number;
  currency: string;
  accountId: string | null;
  categoryId: string | null;
  category: string;
  note: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  splitId?: string | null;
}

export interface MoneyTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountMinor: number;
  currency: string;
  note: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoneySplitLine {
  id: string;
  categoryId: string;
  category: string;
  amountMinor: number;
  note: string;
}

export interface MoneySplit {
  id: string;
  parentEntryId: string;
  lines: MoneySplitLine[];
  createdAt: string;
  updatedAt: string;
}

export type BudgetPeriod = 'day' | 'week' | 'month';

export interface MoneyBudget {
  id: string;
  categoryId: string;
  category: string;
  amountMinor: number;
  currency: string;
  period: BudgetPeriod;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  details: string;
  status: 'open' | 'completed';
  dueLocalDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UsagePermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

export interface UsageSnapshot {
  id: string;
  packageName: string;
  displayName: string;
  localDate: string;
  durationSeconds: number;
  sourceReadAt: string;
  included: boolean;
}

export interface UsageRead {
  permission: UsagePermissionState;
  lastReadAt: string | null;
  rangeStartMillis: number | null;
  rangeEndMillis: number | null;
  errorCode: string | null;
}

export interface TimeGoal {
  id: string;
  name: string;
  period: 'day' | 'week';
  targetSeconds: number;
  isArchived: boolean;
}

export interface AppData {
  schemaVersion: 6;
  mainCurrency: string;
  money: MoneyEntry[];
  transfers: MoneyTransfer[];
  splits: MoneySplit[];
  budgets: MoneyBudget[];
  accounts: MoneyAccount[];
  categories: MoneyCategory[];
  notes: Note[];
  tasks: Task[];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
  usageExcludedPackages: string[];
  timeGoals: TimeGoal[];
}

export const createDefaultCategories = (): MoneyCategory[] => [
  {id: 'category_food', name: 'Food', kind: 'expense', isArchived: false},
  {id: 'category_housing', name: 'Housing', kind: 'expense', isArchived: false},
  {id: 'category_transport', name: 'Transport', kind: 'expense', isArchived: false},
  {id: 'category_shopping', name: 'Shopping', kind: 'expense', isArchived: false},
  {id: 'category_health', name: 'Health', kind: 'expense', isArchived: false},
  {id: 'category_income', name: 'Income', kind: 'income', isArchived: false},
  {id: 'category_uncategorized', name: 'Uncategorized', kind: 'both', isArchived: false},
];

export const emptyAppData = (): AppData => ({
  schemaVersion: 6,
  mainCurrency: 'EUR',
  money: [],
  transfers: [],
  splits: [],
  budgets: [],
  accounts: [
    {
      id: 'account_everyday',
      name: 'Everyday',
      currency: 'EUR',
      openingBalanceMinor: 0,
      isArchived: false,
    },
  ],
  categories: createDefaultCategories(),
  notes: [],
  tasks: [],
  usageSnapshots: [],
  usageRead: {
    permission: 'unknown',
    lastReadAt: null,
    rangeStartMillis: null,
    rangeEndMillis: null,
    errorCode: null,
  },
  usageExcludedPackages: [],
  timeGoals: [],
});
