import type {AppGroup} from '../types/domain';

export const APP_GROUP_MAX_NAME_LENGTH = 80;

export interface AppGroupDraft {
  name: string;
  packageNames: string[];
}

export function validateAppGroupName(groups: readonly AppGroup[], draft: AppGroupDraft, excludedGroupId: string | null = null): string | null {
  const normalizedName = draft.name.trim().toLocaleLowerCase();
  if (groups.some(group => group.id !== excludedGroupId && group.name.toLocaleLowerCase() === normalizedName)) {
    return 'App group names must be unique.';
  }
  return null;
}

export function normalizeAppGroupPackageNames(packageNames: readonly string[]): string[] {
  return packageNames.map(packageName => packageName.trim()).filter(Boolean);
}

export function validateAppGroupDraft(draft: AppGroupDraft): string | null {
  if (typeof draft.name !== 'string' || !draft.name.trim()) {
    return 'App group name is required.';
  }
  if (draft.name.trim().length > APP_GROUP_MAX_NAME_LENGTH) {
    return `App group name must be ${APP_GROUP_MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (!Array.isArray(draft.packageNames)) {
    return 'App group packages are invalid.';
  }
  const packageNames = normalizeAppGroupPackageNames(draft.packageNames);
  if (packageNames.length === 0) {
    return 'Add at least one app package to the group.';
  }
  if (packageNames.some(packageName => /\s/.test(packageName))) {
    return 'App package names cannot contain spaces.';
  }
  if (new Set(packageNames).size !== packageNames.length) {
    return 'App group packages must be unique.';
  }
  return null;
}

export function createAppGroupRecord(draft: AppGroupDraft, id: string, timestamp: string): AppGroup {
  const validationError = validateAppGroupDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }
  return {
    id,
    name: draft.name.trim(),
    packageNames: normalizeAppGroupPackageNames(draft.packageNames),
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateAppGroupRecord(group: AppGroup, draft: AppGroupDraft, timestamp: string): AppGroup {
  const validationError = validateAppGroupDraft(draft);
  if (validationError) {
    throw new Error(validationError);
  }
  return {...group, name: draft.name.trim(), packageNames: normalizeAppGroupPackageNames(draft.packageNames), updatedAt: timestamp};
}

export function setAppGroupArchived(groups: AppGroup[], groupId: string, isArchived: boolean, timestamp = new Date().toISOString()): AppGroup[] {
  if (!groups.some(group => group.id === groupId)) {
    throw new Error('The app group no longer exists.');
  }
  return groups.map(group => group.id === groupId ? {...group, isArchived, updatedAt: timestamp} : group);
}

export function deleteAppGroupRecord(groups: AppGroup[], focusSessions: readonly {appGroupId: string | null}[], groupId: string): AppGroup[] {
  if (!groups.some(group => group.id === groupId)) {
    throw new Error('The app group no longer exists.');
  }
  if (focusSessions.some(session => session.appGroupId === groupId)) {
    throw new Error('App groups with focus sessions cannot be deleted.');
  }
  return groups.filter(group => group.id !== groupId);
}
