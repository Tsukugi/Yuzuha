import type {
  AppData,
  Attachment,
  AppGroup,
  FocusSession,
  MoneyAccount,
  MoneyBudget,
  MoneyCategory,
  MoneyEntry,
  MissedOccurrencePolicy,
  MoneyRecurrenceRule,
  MoneySplit,
  MoneyTransfer,
  Note,
  SavedSearch,
  Task,
  TaskDependency,
  TaskList,
  TaskProject,
  TaskRecurrenceRule,
  TaskTemplate,
  TimeGoal,
  UsageSnapshot,
} from '../types/domain';
import {ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_NAME_LENGTH, ATTACHMENT_MAX_PER_NOTE, isSha256, isSupportedAttachmentMimeType} from './attachment';
import {isValidLocalDate} from './moneyRecurrence';
import {validateNoteTags} from './noteSearch';
import {validateSavedSearchDraft} from './savedSearch';
import {TASK_LIST_MAX_NAME_LENGTH} from './taskListLifecycle';
import {isValidTaskReminderSnoozeDuration} from './notificationSettings';
import {isValidTaskRecurrenceReminderLocalTime} from './taskRecurrence';
import {validateTaskDependencyDraft} from './taskDependency';
import {TASK_PROJECT_MAX_NAME_LENGTH} from './projectLifecycle';
import {validateAppGroupDraft} from './appGroupLifecycle';
import {validateTaskParentLink} from './taskSubtask';
import {validateTaskTemplateDraft} from './taskTemplateLifecycle';

export interface JsonImportRecordCounts {
  money: number;
  transfers: number;
  splits: number;
  budgets: number;
  recurrences: number;
  accounts: number;
  categories: number;
  notes: number;
  attachments: number;
  savedSearches: number;
  projects: number;
  templates: number;
  taskLists: number;
  taskRecurrences: number;
  tasks: number;
  taskDependencies: number;
  usageSnapshots: number;
  timeGoals: number;
  appGroups: number;
  focusSessions: number;
}

export interface JsonImportPreview {
  data: AppData;
  recordCounts: JsonImportRecordCounts;
  totalRecords: number;
}

export class JsonImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonImportError';
  }
}

export function parseJsonImport(raw: string): JsonImportPreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new JsonImportError('The restore text is not valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new JsonImportError('The restore envelope must be a JSON object.');
  }
  if (parsed.exportSchemaVersion !== 1) {
    throw new JsonImportError('This JSON export version is not supported.');
  }
  const appSchemaVersion = parsed.appSchemaVersion;
  if (appSchemaVersion !== 28) {
    throw new JsonImportError('This app data version is not supported.');
  }
  if (!isIsoDate(parsed.exportedAt)) {
    throw new JsonImportError('The export timestamp is invalid.');
  }

  validateCurrentAppData(parsed.data);
  const data = parsed.data;
  const recordCounts = countRecords(data);
  return {
    data,
    recordCounts,
    totalRecords: Object.values(recordCounts).reduce((total, count) => total + count, 0),
  };
}

export function validateCurrentAppData(value: unknown): asserts value is AppData {
  const notificationSettings = isRecord(value) ? value.notificationSettings : null;
  if (!isRecord(value) || value.schemaVersion !== 28 || !isCurrency(value.mainCurrency) || !isRecord(notificationSettings) ||
      !isValidTaskReminderSnoozeDuration(notificationSettings.snoozeDurationMinutes) || typeof notificationSettings.taskRemindersEnabled !== 'boolean' ||
      typeof notificationSettings.recurringTaskRemindersEnabled !== 'boolean') {
    throw new JsonImportError('The export has an invalid app header.');
  }
  const data = value as unknown as AppData;

  validateUniqueIds('money entries', data.money);
  validateUniqueIds('transfers', data.transfers);
  validateUniqueIds('splits', data.splits);
  validateUniqueIds('budgets', data.budgets);
  validateUniqueIds('recurring rules', data.recurrences);
  validateUniqueIds('accounts', data.accounts);
  validateUniqueIds('categories', data.categories);
  validateUniqueIds('notes', data.notes);
  validateUniqueIds('attachments', data.attachments);
  validateUniqueIds('saved searches', data.savedSearches);
  validateUniqueIds('projects', data.projects);
  validateUniqueIds('task templates', data.templates);
  validateUniqueIds('task lists', data.taskLists);
  validateUniqueIds('task recurrence rules', data.taskRecurrences);
  validateUniqueIds('tasks', data.tasks);
  validateUniqueIds('task dependencies', data.taskDependencies);
  validateUniqueIds('usage snapshots', data.usageSnapshots);
  validateUniqueIds('time goals', data.timeGoals);
  validateUniqueIds('app groups', data.appGroups);
  validateUniqueIds('focus sessions', data.focusSessions);

  const accountIds = new Set(data.accounts.map(account => account.id));
  const categoryIds = new Set(data.categories.map(category => category.id));
  const noteIds = new Set(data.notes.map(note => note.id));
  const taskListIds = new Set(data.taskLists.map(taskList => taskList.id));
  const taskRecurrenceIds = new Set(data.taskRecurrences.map(rule => rule.id));
  const moneyById = new Map(data.money.map(entry => [entry.id, entry]));
  const splitLineIds = new Set<string>();

  data.accounts.forEach(validateAccount);
  data.categories.forEach(validateCategory);
  data.money.forEach(entry => validateMoneyEntry(entry, accountIds, categoryIds));
  data.transfers.forEach(transfer => validateTransfer(transfer, accountIds));
  data.splits.forEach(split => {
    validateSplit(split, moneyById, categoryIds, splitLineIds);
  });
  data.budgets.forEach(budget => validateBudget(budget, categoryIds));
  data.recurrences.forEach(rule => validateRecurrence(rule, accountIds, categoryIds));
  data.notes.forEach(validateNote);
  const attachmentCounts = new Map<string, number>();
  data.attachments.forEach(attachment => {
    validateAttachment(attachment, noteIds);
    const count = (attachmentCounts.get(attachment.noteId) ?? 0) + 1;
    attachmentCounts.set(attachment.noteId, count);
    if (count > ATTACHMENT_MAX_PER_NOTE) {
      throw new JsonImportError(`Note ${attachment.noteId} has more than ${ATTACHMENT_MAX_PER_NOTE} attachments.`);
    }
  });
  data.savedSearches.forEach(validateSavedSearch);
  const projectNames = new Set<string>();
  data.projects.forEach(project => {
    validateProject(project);
    const normalizedName = project.name.toLocaleLowerCase();
    if (projectNames.has(normalizedName)) {
      throw new JsonImportError(`Project ${project.id} duplicates another project name.`);
    }
    projectNames.add(normalizedName);
  });
  const projectIds = new Set(data.projects.map(project => project.id));
  const templateNames = new Set<string>();
  data.templates.forEach(template => {
    validateTaskTemplate(template, taskListIds, projectIds);
    const normalizedName = template.name.toLocaleLowerCase();
    if (templateNames.has(normalizedName)) {
      throw new JsonImportError(`Task template ${template.id} duplicates another template name.`);
    }
    templateNames.add(normalizedName);
  });
  const taskListNames = new Set<string>();
  data.taskLists.forEach(taskList => {
    validateTaskList(taskList);
    const normalizedName = taskList.name.toLocaleLowerCase();
    if (taskListNames.has(normalizedName)) {
      throw new JsonImportError(`Task list ${taskList.id} duplicates another list name.`);
    }
    taskListNames.add(normalizedName);
  });
  data.taskRecurrences.forEach(rule => validateTaskRecurrence(rule, taskListIds));
  data.tasks.forEach(task => validateTask(task, taskListIds, taskRecurrenceIds, projectIds));
  data.tasks.forEach(task => {
    const parentError = validateTaskParentLink(task.id, task.parentTaskId, data.tasks);
    if (parentError) {
      throw new JsonImportError(`Task ${task.id} has an invalid parent: ${parentError}`);
    }
  });
  const sortOrdersByList = new Set<string>();
  data.tasks.forEach(task => {
    const key = `${task.listId}:${task.sortOrder}`;
    if (sortOrdersByList.has(key)) {
      throw new JsonImportError(`Task ${task.id} duplicates a manual order in its list.`);
    }
    sortOrdersByList.add(key);
  });
  const taskIds = new Set(data.tasks.map(task => task.id));
  data.taskDependencies.forEach((dependency, index) => validateTaskDependency(dependency, taskIds, data.tasks, data.taskDependencies.slice(0, index)));
  data.usageSnapshots.forEach(validateUsageSnapshot);
  validateUsageRead(data);
  data.timeGoals.forEach(validateTimeGoal);
  data.appGroups.forEach(validateAppGroup);
  data.focusSessions.forEach(validateFocusSession);
  if (data.focusSessions.filter(session => session.status === 'active').length > 1) {
    throw new JsonImportError('The export has more than one active focus session.');
  }

  if (!Array.isArray(data.usageExcludedPackages) || data.usageExcludedPackages.some(item => typeof item !== 'string')) {
    throw new JsonImportError('The export has invalid app-time exclusions.');
  }
}

function validateAccount(account: MoneyAccount): void {
  validateId(account.id, 'account');
  if (typeof account.name !== 'string' || !isCurrency(account.currency) || !Number.isSafeInteger(account.openingBalanceMinor)) {
    throw new JsonImportError(`Account ${account.id} has invalid fields.`);
  }
  if (typeof account.isArchived !== 'boolean') {
    throw new JsonImportError(`Account ${account.id} has an invalid archive flag.`);
  }
}

function validateCategory(category: MoneyCategory): void {
  validateId(category.id, 'category');
  if (typeof category.name !== 'string' || !isValidKindOrBoth(category.kind) || typeof category.isArchived !== 'boolean') {
    throw new JsonImportError(`Category ${category.id} has invalid fields.`);
  }
}

function validateMoneyEntry(entry: MoneyEntry, accountIds: Set<string>, categoryIds: Set<string>): void {
  validateId(entry.id, 'money entry');
  validateMoneyFields(entry.amountMinor, entry.currency, entry.kind, entry.occurredAt, entry.createdAt, entry.updatedAt, entry.id);
  validateOptionalReference(entry.accountId, accountIds, `Money entry ${entry.id} account`);
  validateOptionalReference(entry.categoryId, categoryIds, `Money entry ${entry.id} category`);
  if (typeof entry.category !== 'string' || typeof entry.note !== 'string' || (entry.splitId !== undefined && entry.splitId !== null && typeof entry.splitId !== 'string')) {
    throw new JsonImportError(`Money entry ${entry.id} has invalid fields.`);
  }
}

function validateTransfer(transfer: MoneyTransfer, accountIds: Set<string>): void {
  validateId(transfer.id, 'transfer');
  validateMoneyFields(transfer.amountMinor, transfer.currency, 'expense', transfer.occurredAt, transfer.createdAt, transfer.updatedAt, transfer.id);
  if (typeof transfer.fromAccountId !== 'string' || typeof transfer.toAccountId !== 'string' || transfer.fromAccountId === transfer.toAccountId) {
    throw new JsonImportError(`Transfer ${transfer.id} has invalid account links.`);
  }
  validateReference(transfer.fromAccountId, accountIds, `Transfer ${transfer.id} source account`);
  validateReference(transfer.toAccountId, accountIds, `Transfer ${transfer.id} target account`);
  if (typeof transfer.note !== 'string') {
    throw new JsonImportError(`Transfer ${transfer.id} has an invalid note.`);
  }
}

function validateSplit(
  split: MoneySplit,
  moneyById: Map<string, MoneyEntry>,
  categoryIds: Set<string>,
  splitLineIds: Set<string>,
): void {
  validateId(split.id, 'split');
  validateReference(split.parentEntryId, moneyById, `Split ${split.id} parent`);
  if (!Array.isArray(split.lines) || split.lines.length < 2 || !isIsoDate(split.createdAt) || !isIsoDate(split.updatedAt)) {
    throw new JsonImportError(`Split ${split.id} has invalid fields.`);
  }
  const parent = moneyById.get(split.parentEntryId);
  let lineTotal = 0;
  split.lines.forEach(line => {
    validateId(line.id, 'split line');
    if (splitLineIds.has(line.id)) {
      throw new JsonImportError(`Split line ${line.id} is duplicated.`);
    }
    splitLineIds.add(line.id);
    validateReference(line.categoryId, categoryIds, `Split line ${line.id} category`);
    if (!Number.isSafeInteger(line.amountMinor) || line.amountMinor <= 0 || typeof line.category !== 'string' || typeof line.note !== 'string') {
      throw new JsonImportError(`Split line ${line.id} has invalid fields.`);
    }
    lineTotal += line.amountMinor;
  });
  if (!parent || lineTotal !== parent.amountMinor || parent.splitId !== split.id) {
    throw new JsonImportError(`Split ${split.id} does not match its parent amount.`);
  }
}

function validateBudget(budget: MoneyBudget, categoryIds: Set<string>): void {
  validateId(budget.id, 'budget');
  validateReference(budget.categoryId, categoryIds, `Budget ${budget.id} category`);
  if (!Number.isSafeInteger(budget.amountMinor) || budget.amountMinor <= 0 || !isCurrency(budget.currency) ||
      !isBudgetPeriod(budget.period) || !isRollover(budget.rollover) || typeof budget.category !== 'string' ||
      typeof budget.isArchived !== 'boolean' || !isIsoDate(budget.createdAt) || !isIsoDate(budget.updatedAt)) {
    throw new JsonImportError(`Budget ${budget.id} has invalid fields.`);
  }
}

function validateRecurrence(rule: MoneyRecurrenceRule, accountIds: Set<string>, categoryIds: Set<string>): void {
  validateId(rule.id, 'recurring rule');
  validateMoneyFields(rule.amountMinor, rule.currency, rule.kind, rule.createdAt, rule.createdAt, rule.updatedAt, rule.id);
  validateOptionalReference(rule.accountId, accountIds, `Recurring rule ${rule.id} account`);
  validateOptionalReference(rule.categoryId, categoryIds, `Recurring rule ${rule.id} category`);
  if (typeof rule.category !== 'string' || typeof rule.note !== 'string' ||
      !isRecurrenceCadence(rule.cadence) || !Number.isSafeInteger(rule.interval) || rule.interval < 1 || rule.interval > 365 ||
      !isValidLocalDate(rule.nextOccurrenceLocalDate) || !isMissedOccurrencePolicy(rule.missedOccurrencePolicy) || typeof rule.isPaused !== 'boolean') {
    throw new JsonImportError(`Recurring rule ${rule.id} has invalid fields.`);
  }
}

function validateNote(note: Note): void {
  validateId(note.id, 'note');
  if (typeof note.title !== 'string' || typeof note.body !== 'string' || !validateNoteTags(note.tags) || typeof note.isPinned !== 'boolean' || typeof note.isArchived !== 'boolean' ||
      !isIsoDate(note.createdAt) || !isIsoDate(note.updatedAt)) {
    throw new JsonImportError(`Note ${note.id} has invalid fields.`);
  }
}

function validateAttachment(attachment: Attachment, noteIds: Set<string>): void {
  validateId(attachment.id, 'attachment');
  validateReference(attachment.noteId, noteIds, `Attachment ${attachment.id} note`);
  if (typeof attachment.name !== 'string' || attachment.name.trim().length === 0 || attachment.name.length > ATTACHMENT_MAX_NAME_LENGTH ||
      !isSupportedAttachmentMimeType(attachment.mimeType) || !Number.isSafeInteger(attachment.byteSize) || attachment.byteSize <= 0 ||
      attachment.byteSize > ATTACHMENT_MAX_BYTES || !isSha256(attachment.sha256) || !isIsoDate(attachment.createdAt) || !isIsoDate(attachment.updatedAt)) {
    throw new JsonImportError(`Attachment ${attachment.id} has invalid fields.`);
  }
}

function validateSavedSearch(savedSearch: SavedSearch): void {
  validateId(savedSearch.id, 'saved search');
  if (validateSavedSearchDraft(savedSearch) !== null ||
      savedSearch.name !== savedSearch.name.trim() || savedSearch.query !== savedSearch.query.trim() ||
      !isIsoDate(savedSearch.createdAt) || !isIsoDate(savedSearch.updatedAt)) {
    throw new JsonImportError(`Saved search ${savedSearch.id} has invalid fields.`);
  }
}

function validateTaskList(taskList: TaskList): void {
  validateId(taskList.id, 'task list');
  if (typeof taskList.name !== 'string' || taskList.name.trim() === '' || taskList.name !== taskList.name.trim() || taskList.name.length > TASK_LIST_MAX_NAME_LENGTH ||
      typeof taskList.isArchived !== 'boolean' ||
      !isIsoDate(taskList.createdAt) || !isIsoDate(taskList.updatedAt)) {
    throw new JsonImportError(`Task list ${taskList.id} has invalid fields.`);
  }
}

function validateProject(project: TaskProject): void {
  validateId(project.id, 'project');
  if (typeof project.name !== 'string' || project.name.trim() === '' || project.name !== project.name.trim() || project.name.length > TASK_PROJECT_MAX_NAME_LENGTH ||
      (project.status !== 'active' && project.status !== 'completed') || typeof project.isArchived !== 'boolean' ||
      !isIsoDate(project.createdAt) || !isIsoDate(project.updatedAt)) {
    throw new JsonImportError(`Project ${project.id} has invalid fields.`);
  }
}

function validateTaskRecurrence(rule: TaskRecurrenceRule, taskListIds: Set<string>): void {
  validateId(rule.id, 'task recurrence rule');
  if (typeof rule.title !== 'string' || !rule.title.trim() || typeof rule.details !== 'string' ||
      (rule.priority !== 'low' && rule.priority !== 'normal' && rule.priority !== 'high') ||
      !taskListIds.has(rule.listId) || !isRecurrenceCadence(rule.cadence) || !Number.isSafeInteger(rule.interval) ||
      rule.interval < 1 || rule.interval > 365 || !isValidLocalDate(rule.nextOccurrenceLocalDate) ||
      !isMissedOccurrencePolicy(rule.missedOccurrencePolicy) ||
      (rule.reminderLocalTime !== null && !isValidTaskRecurrenceReminderLocalTime(rule.reminderLocalTime)) ||
      typeof rule.isPaused !== 'boolean' ||
      !isIsoDate(rule.createdAt) || !isIsoDate(rule.updatedAt)) {
    throw new JsonImportError(`Task recurrence rule ${rule.id} has invalid fields.`);
  }
}

function validateTask(task: Task, taskListIds: Set<string>, taskRecurrenceIds: Set<string>, projectIds: Set<string>): void {
  validateId(task.id, 'task');
  if (typeof task.title !== 'string' || typeof task.details !== 'string' ||
      (task.status !== 'open' && task.status !== 'completed') ||
      (task.dueLocalDate !== null && !isValidLocalDate(task.dueLocalDate)) ||
      (task.priority !== 'low' && task.priority !== 'normal' && task.priority !== 'high') ||
      !taskListIds.has(task.listId) ||
      (task.parentTaskId !== null && typeof task.parentTaskId !== 'string') ||
      !Number.isSafeInteger(task.sortOrder) || task.sortOrder < 0 ||
      (task.projectId !== null && !projectIds.has(task.projectId)) ||
      (task.sourceNoteId !== null && typeof task.sourceNoteId !== 'string') ||
      (task.recurrenceRuleId !== null && !taskRecurrenceIds.has(task.recurrenceRuleId)) ||
      (task.reminderAtMillis !== null && (!Number.isSafeInteger(task.reminderAtMillis) || task.reminderAtMillis <= 0)) ||
      !isIsoDate(task.createdAt) || !isIsoDate(task.updatedAt)) {
    throw new JsonImportError(`Task ${task.id} has invalid fields.`);
  }
}

function validateTaskTemplate(template: TaskTemplate, taskListIds: Set<string>, projectIds: Set<string>): void {
  validateId(template.id, 'task template');
  const validationError = validateTaskTemplateDraft({
    name: template.name,
    title: template.title,
    details: template.details,
    priority: template.priority,
    listId: template.listId,
    projectId: template.projectId,
  }, taskListIds, projectIds);
  if (validationError || template.name.trim() !== template.name || template.title.trim() !== template.title || template.details.trim() !== template.details ||
      typeof template.isArchived !== 'boolean' || !isIsoDate(template.createdAt) || !isIsoDate(template.updatedAt)) {
    throw new JsonImportError(`Task template ${template.id} has invalid fields.`);
  }
}

function validateTaskDependency(
  dependency: TaskDependency,
  taskIds: Set<string>,
  tasks: Task[],
  previousDependencies: TaskDependency[],
): void {
  validateId(dependency.id, 'task dependency');
  if (!taskIds.has(dependency.sourceTaskId) || !taskIds.has(dependency.dependentTaskId) ||
      dependency.dependencyType !== 'completed' || !isIsoDate(dependency.createdAt) || !isIsoDate(dependency.updatedAt)) {
    throw new JsonImportError(`Task dependency ${dependency.id} has invalid fields.`);
  }
  const validationError = validateTaskDependencyDraft(
    {sourceTaskId: dependency.sourceTaskId, dependentTaskId: dependency.dependentTaskId},
    tasks,
    previousDependencies,
  );
  if (validationError) {
    throw new JsonImportError(`Task dependency ${dependency.id} is invalid: ${validationError}`);
  }
}

function validateUsageSnapshot(snapshot: UsageSnapshot): void {
  validateId(snapshot.id, 'usage snapshot');
  if (typeof snapshot.packageName !== 'string' || typeof snapshot.displayName !== 'string' ||
      !isValidLocalDate(snapshot.localDate) || !Number.isSafeInteger(snapshot.durationSeconds) || snapshot.durationSeconds < 0 ||
      !isIsoDate(snapshot.sourceReadAt) || typeof snapshot.included !== 'boolean') {
    throw new JsonImportError(`Usage snapshot ${snapshot.id} has invalid fields.`);
  }
}

function validateUsageRead(data: AppData): void {
  const read = data.usageRead;
  if (!isRecord(read) || !['unknown', 'granted', 'denied', 'unsupported'].includes(read.permission) ||
      (read.lastReadAt !== null && !isIsoDate(read.lastReadAt)) ||
      (read.rangeStartMillis !== null && !Number.isSafeInteger(read.rangeStartMillis)) ||
      (read.rangeEndMillis !== null && !Number.isSafeInteger(read.rangeEndMillis)) ||
      (read.errorCode !== null && typeof read.errorCode !== 'string')) {
    throw new JsonImportError('The export has invalid app-time read metadata.');
  }
}

function validateTimeGoal(goal: TimeGoal): void {
  validateId(goal.id, 'time goal');
  if (typeof goal.name !== 'string' || (goal.period !== 'day' && goal.period !== 'week') ||
      !Number.isSafeInteger(goal.targetSeconds) || goal.targetSeconds <= 0 || typeof goal.isArchived !== 'boolean') {
    throw new JsonImportError(`Time goal ${goal.id} has invalid fields.`);
  }
}

function validateAppGroup(group: AppGroup): void {
  validateId(group.id, 'app group');
  const validationError = validateAppGroupDraft({name: group.name, packageNames: group.packageNames});
  if (validationError || group.name.trim() !== group.name || group.packageNames.some(packageName => packageName.trim() !== packageName) ||
      typeof group.isArchived !== 'boolean' || !isIsoDate(group.createdAt) || !isIsoDate(group.updatedAt)) {
    throw new JsonImportError(`App group ${group.id} has invalid fields.`);
  }
}

function validateFocusSession(session: FocusSession): void {
  validateId(session.id, 'focus session');
  const links = [session.taskId, session.projectId, session.noteId, session.appGroupId];
  if (links.some(link => link !== null && typeof link !== 'string') ||
      !isIsoDate(session.startedAt) ||
      (session.endedAt !== null && !isIsoDate(session.endedAt)) ||
      (session.status !== 'active' && session.status !== 'completed' && session.status !== 'stopped') ||
      (session.stopReason !== null && session.stopReason !== 'completed' && session.stopReason !== 'manual' && session.stopReason !== 'interrupted') ||
      !isIsoDate(session.createdAt) || !isIsoDate(session.updatedAt)) {
    throw new JsonImportError(`Focus session ${session.id} has invalid fields.`);
  }
  if (session.status === 'active' && (session.endedAt !== null || session.stopReason !== null)) {
    throw new JsonImportError(`Focus session ${session.id} has an invalid active state.`);
  }
  if (session.status === 'completed' && (session.endedAt === null || session.stopReason !== 'completed')) {
    throw new JsonImportError(`Focus session ${session.id} has an invalid completed state.`);
  }
  if (session.status === 'stopped' && (session.endedAt === null || (session.stopReason !== 'manual' && session.stopReason !== 'interrupted'))) {
    throw new JsonImportError(`Focus session ${session.id} has an invalid stopped state.`);
  }
  if (session.endedAt !== null && Date.parse(session.endedAt) <= Date.parse(session.startedAt)) {
    throw new JsonImportError(`Focus session ${session.id} must end after start.`);
  }
}

function validateMoneyFields(
  amountMinor: number,
  currency: string,
  kind: string,
  occurredAt: string,
  createdAt: string,
  updatedAt: string,
  id: string,
): void {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !isCurrency(currency) ||
      !isValidKind(kind) || !isIsoDate(occurredAt) || !isIsoDate(createdAt) || !isIsoDate(updatedAt)) {
    throw new JsonImportError(`Record ${id} has invalid money fields.`);
  }
}

function validateUniqueIds<T extends {id: string}>(label: string, values: T[]): void {
  if (!Array.isArray(values)) {
    throw new JsonImportError(`The export has invalid ${label}.`);
  }
  const ids = new Set<string>();
  values.forEach(value => {
    if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim() === '' || ids.has(value.id)) {
      throw new JsonImportError(`The export has invalid or duplicate ${label}.`);
    }
    ids.add(value.id);
  });
}

function validateId(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new JsonImportError(`The export has an invalid ${label} ID.`);
  }
}

function validateReference<T>(value: string, values: Set<string> | Map<string, T>, label: string): void {
  if (typeof value !== 'string' || !values.has(value)) {
    throw new JsonImportError(`${label} is missing.`);
  }
}

function validateOptionalReference(value: string | null, values: Set<string>, label: string): void {
  if (value !== null) {
    validateReference(value, values, label);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isCurrency(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

function isValidKind(value: string): value is 'income' | 'expense' {
  return value === 'income' || value === 'expense';
}

function isValidKindOrBoth(value: unknown): value is 'income' | 'expense' | 'both' {
  return value === 'income' || value === 'expense' || value === 'both';
}

function isBudgetPeriod(value: unknown): value is 'day' | 'week' | 'month' {
  return value === 'day' || value === 'week' || value === 'month';
}

function isRollover(value: unknown): value is 'none' | 'carry-forward' {
  return value === 'none' || value === 'carry-forward';
}

function isRecurrenceCadence(value: unknown): value is 'day' | 'week' | 'month' {
  return value === 'day' || value === 'week' || value === 'month';
}

function isMissedOccurrencePolicy(value: unknown): value is MissedOccurrencePolicy {
  return value === 'all' || value === 'one' || value === 'skip';
}

function countRecords(data: AppData): JsonImportRecordCounts {
  return {
    money: data.money.length,
    transfers: data.transfers.length,
    splits: data.splits.length,
    budgets: data.budgets.length,
    recurrences: data.recurrences.length,
    accounts: data.accounts.length,
    categories: data.categories.length,
    notes: data.notes.length,
    attachments: data.attachments.length,
    savedSearches: data.savedSearches.length,
    projects: data.projects.length,
    templates: data.templates.length,
    taskLists: data.taskLists.length,
    taskRecurrences: data.taskRecurrences.length,
    tasks: data.tasks.length,
    taskDependencies: data.taskDependencies.length,
    usageSnapshots: data.usageSnapshots.length,
    timeGoals: data.timeGoals.length,
    appGroups: data.appGroups.length,
    focusSessions: data.focusSessions.length,
  };
}
