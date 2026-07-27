import {NativeModules, PermissionsAndroid, Platform} from 'react-native';

interface NativeTaskReminders {
  scheduleTaskReminder: (taskId: string, triggerAtMillis: number) => Promise<boolean>;
  cancelTaskReminder: (taskId: string) => Promise<boolean>;
  syncTaskReminders: (reminders: Array<{taskId: string; triggerAtMillis: number}>) => Promise<boolean>;
}

export class TaskReminderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaskReminderError';
  }
}

const nativeTaskReminders = NativeModules.YuzuhaTaskReminders as NativeTaskReminders | undefined;

export const taskReminders = {
  isSupported(): boolean {
    return Platform.OS === 'android' && nativeTaskReminders !== undefined;
  },

  async requestPermission(): Promise<void> {
    if (!this.isSupported() || !nativeTaskReminders) {
      throw new TaskReminderError('Task reminders are only available in the Android build.');
    }
    if (Number(Platform.Version) < 33) {
      return;
    }
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const current = await PermissionsAndroid.check(permission);
    const result = current ? PermissionsAndroid.RESULTS.GRANTED : await PermissionsAndroid.request(permission);
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new TaskReminderError('Allow notifications to set a task reminder.');
    }
  },

  async schedule(taskId: string, triggerAtMillis: number): Promise<void> {
    if (!this.isSupported() || !nativeTaskReminders) {
      throw new TaskReminderError('Task reminders are not available in this Android build.');
    }
    try {
      await nativeTaskReminders.scheduleTaskReminder(taskId, triggerAtMillis);
    } catch (error) {
      throw new TaskReminderError(error instanceof Error && error.message ? error.message : 'The task reminder could not be scheduled.');
    }
  },

  async cancel(taskId: string): Promise<void> {
    if (!this.isSupported() || !nativeTaskReminders) {
      return;
    }
    try {
      await nativeTaskReminders.cancelTaskReminder(taskId);
    } catch (error) {
      throw new TaskReminderError(error instanceof Error && error.message ? error.message : 'The task reminder could not be canceled.');
    }
  },

  async sync(reminders: Array<{taskId: string; triggerAtMillis: number}>): Promise<void> {
    if (!this.isSupported() || !nativeTaskReminders) {
      return;
    }
    try {
      await nativeTaskReminders.syncTaskReminders(reminders);
    } catch (error) {
      throw new TaskReminderError(error instanceof Error && error.message ? error.message : 'Task reminders could not be synchronized.');
    }
  },
};
