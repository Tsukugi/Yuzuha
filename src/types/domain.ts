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
export type BudgetRollover = 'none' | 'carry-forward';

export interface MoneyBudget {
  id: string;
  categoryId: string;
  category: string;
  amountMinor: number;
  currency: string;
  period: BudgetPeriod;
  rollover: BudgetRollover;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecurrenceCadence = 'day' | 'week' | 'month';
export type MissedOccurrencePolicy = 'all' | 'one' | 'skip';

export interface MoneyRecurrenceRule {
  id: string;
  kind: MoneyKind;
  amountMinor: number;
  currency: string;
  accountId: string | null;
  categoryId: string | null;
  category: string;
  note: string;
  cadence: RecurrenceCadence;
  interval: number;
  nextOccurrenceLocalDate: string;
  missedOccurrencePolicy: MissedOccurrencePolicy;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  noteId: string;
  name: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  showArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'normal' | 'high';

export interface TaskList {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskProjectStatus = 'active' | 'completed';

export interface TaskProject {
  id: string;
  name: string;
  status: TaskProjectStatus;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  details: string;
  status: 'open' | 'completed';
  dueLocalDate: string | null;
  priority: TaskPriority;
  listId: string;
  parentTaskId: string | null;
  sortOrder: number;
  projectId: string | null;
  sourceNoteId: string | null;
  recurrenceRuleId: string | null;
  reminderAtMillis: number | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskDependencyType = 'completed';

export interface TaskDependency {
  id: string;
  sourceTaskId: string;
  dependentTaskId: string;
  dependencyType: TaskDependencyType;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecurrenceRule {
  id: string;
  title: string;
  details: string;
  priority: TaskPriority;
  listId: string;
  cadence: RecurrenceCadence;
  interval: number;
  nextOccurrenceLocalDate: string;
  missedOccurrencePolicy: MissedOccurrencePolicy;
  reminderLocalTime: string | null;
  isPaused: boolean;
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

export interface NotificationSettings {
  quietHoursStartLocalTime: string | null;
  quietHoursEndLocalTime: string | null;
  snoozeDurationMinutes: TaskReminderSnoozeDurationMinutes;
  taskRemindersEnabled: boolean;
  recurringTaskRemindersEnabled: boolean;
}

export type TaskReminderSnoozeDurationMinutes = 15 | 30 | 60 | 120;

export interface TimeGoal {
  id: string;
  name: string;
  period: 'day' | 'week';
  targetSeconds: number;
  isArchived: boolean;
}

export interface AppGroup {
  id: string;
  name: string;
  packageNames: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FocusSessionStatus = 'active' | 'completed' | 'stopped';
export type FocusSessionStopReason = 'completed' | 'manual' | 'interrupted' | null;

export interface FocusSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  status: FocusSessionStatus;
  stopReason: FocusSessionStopReason;
  taskId: string | null;
  projectId: string | null;
  noteId: string | null;
  appGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  schemaVersion: 27;
  mainCurrency: string;
  money: MoneyEntry[];
  transfers: MoneyTransfer[];
  splits: MoneySplit[];
  budgets: MoneyBudget[];
  recurrences: MoneyRecurrenceRule[];
  accounts: MoneyAccount[];
  categories: MoneyCategory[];
  notes: Note[];
  attachments: Attachment[];
  savedSearches: SavedSearch[];
  projects: TaskProject[];
  taskLists: TaskList[];
  taskRecurrences: TaskRecurrenceRule[];
  tasks: Task[];
  taskDependencies: TaskDependency[];
  usageSnapshots: UsageSnapshot[];
  usageRead: UsageRead;
  usageExcludedPackages: string[];
  timeGoals: TimeGoal[];
  appGroups: AppGroup[];
  focusSessions: FocusSession[];
  notificationSettings: NotificationSettings;
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
  schemaVersion: 27,
  mainCurrency: 'EUR',
  money: [],
  transfers: [],
  splits: [],
  budgets: [],
  recurrences: [],
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
  attachments: [],
  savedSearches: [],
  projects: [],
  taskLists: [
    {
      id: 'task_list_inbox',
      name: 'Inbox',
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  taskRecurrences: [],
  tasks: [],
  taskDependencies: [],
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
  appGroups: [],
  focusSessions: [],
  notificationSettings: {
    quietHoursStartLocalTime: null,
    quietHoursEndLocalTime: null,
    snoozeDurationMinutes: 60,
    taskRemindersEnabled: true,
    recurringTaskRemindersEnabled: true,
  },
});
