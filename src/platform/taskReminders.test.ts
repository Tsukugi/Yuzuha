import {NativeModules, PermissionsAndroid} from 'react-native';
import {beforeEach} from '@jest/globals';
import {TaskReminderError, taskReminders} from './taskReminders';

jest.mock('react-native', () => ({
  NativeModules: {
    YuzuhaTaskReminders: {
      scheduleTaskReminder: jest.fn(),
      cancelTaskReminder: jest.fn(),
      syncTaskReminders: jest.fn(),
    },
  },
  PermissionsAndroid: {
    PERMISSIONS: {POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS'},
    RESULTS: {GRANTED: 'granted', DENIED: 'denied'},
    check: jest.fn(),
    request: jest.fn(),
  },
  Platform: {OS: 'android', Version: 36},
}));

const native = NativeModules.YuzuhaTaskReminders as {
  scheduleTaskReminder: jest.Mock;
  cancelTaskReminder: jest.Mock;
  syncTaskReminders: jest.Mock;
};

describe('task reminder bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
    (PermissionsAndroid.request as jest.Mock).mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    native.scheduleTaskReminder.mockResolvedValue(true);
    native.cancelTaskReminder.mockResolvedValue(true);
    native.syncTaskReminders.mockResolvedValue(true);
  });

  it('requests notification permission before scheduling', async () => {
    await taskReminders.requestPermission();
    await expect(taskReminders.schedule('task_1', 1780000000000)).resolves.toBeUndefined();

    expect(PermissionsAndroid.request).toHaveBeenCalledWith('android.permission.POST_NOTIFICATIONS');
    expect(native.scheduleTaskReminder).toHaveBeenCalledWith('task_1', 1780000000000);
  });

  it('does not schedule when notification permission is denied', async () => {
    (PermissionsAndroid.request as jest.Mock).mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    await expect(taskReminders.requestPermission()).rejects.toEqual(new TaskReminderError('Allow notifications to set a task reminder.'));
    expect(native.scheduleTaskReminder).not.toHaveBeenCalled();
  });

  it('forwards cancellation and startup synchronization to native scheduling', async () => {
    await taskReminders.cancel('task_1');
    await taskReminders.sync([{taskId: 'task_2', triggerAtMillis: 1780000000000}]);

    expect(native.cancelTaskReminder).toHaveBeenCalledWith('task_1');
    expect(native.syncTaskReminders).toHaveBeenCalledWith([{taskId: 'task_2', triggerAtMillis: 1780000000000}]);
  });
});
