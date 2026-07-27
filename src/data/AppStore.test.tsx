import {createElement} from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {emptyAppData, type AppData} from '../types/domain';
import {adjustTaskReminderForQuietHours} from '../shared/notificationSettings';
import {createTaskRecord} from '../shared/taskLifecycle';
import {taskReminders} from '../platform/taskReminders';
import {AppStoreProvider, useAppStore} from './AppStore';

jest.mock('../shared/attachmentFiles', () => ({
  deleteAttachmentFiles: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./nativeWorkspaceStore', () => ({
  createNativeWorkspaceStore: jest.fn(() => ({load: jest.fn(), save: jest.fn()})),
}));

jest.mock('../platform/taskReminders', () => ({
  taskReminders: {
    sync: jest.fn().mockResolvedValue(undefined),
    requestPermission: jest.fn().mockResolvedValue(undefined),
    schedule: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('AppStore task reminders', () => {
  it('can set a reminder immediately after creating the task', async () => {
    let saved = emptyAppData();
    const store = {
      load: async () => saved,
      save: async (next: AppData) => {
        saved = next;
      },
    };
    let value: ReturnType<typeof useAppStore> | null = null;
    const Probe = () => {
      value = useAppStore();
      return null;
    };
    let renderer: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(createElement(AppStoreProvider, {store}, createElement(Probe)));
      await Promise.resolve();
      await Promise.resolve();
    });

    const triggerAtMillis = Date.now() + 60_000;
    let taskId = '';
    await act(async () => {
      taskId = await value!.addTask({title: 'New task', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'});
      await value!.setTaskReminder(taskId, triggerAtMillis);
    });

    expect(saved.tasks.find(task => task.id === taskId)?.reminderAtMillis).toBe(triggerAtMillis);
    await act(async () => {
      renderer?.unmount();
    });
  });

  it('restores a prior reminder using the quiet-hours projection when saving fails', async () => {
    const previousReminderAt = new Date();
    previousReminderAt.setDate(previousReminderAt.getDate() + 1);
    previousReminderAt.setHours(23, 0, 0, 0);
    const nextReminderAt = new Date(previousReminderAt);
    nextReminderAt.setMinutes(30);
    const existingTask = createTaskRecord(
      {title: 'Existing task', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'},
      'task_existing',
      new Date().toISOString(),
    );
    existingTask.reminderAtMillis = previousReminderAt.getTime();
    let saved = {
      ...emptyAppData(),
      notificationSettings: {
        quietHoursStartLocalTime: '22:00',
        quietHoursEndLocalTime: '07:00',
        snoozeDurationMinutes: 30,
      },
      tasks: [existingTask],
    } as AppData;
    const store = {
      load: async () => saved,
      save: async (next: AppData) => {
        if (next.tasks[0]?.reminderAtMillis === nextReminderAt.getTime()) {
          throw new Error('save failed');
        }
        saved = next;
      },
    };
    let value: ReturnType<typeof useAppStore> | null = null;
    const Probe = () => {
      value = useAppStore();
      return null;
    };
    let renderer: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(createElement(AppStoreProvider, {store}, createElement(Probe)));
      await Promise.resolve();
      await Promise.resolve();
    });

    const schedule = taskReminders.schedule as jest.Mock;
    schedule.mockClear();
    await act(async () => {
      await expect(value!.setTaskReminder('task_existing', nextReminderAt.getTime())).rejects.toThrow('save failed');
    });

    expect(schedule).toHaveBeenNthCalledWith(1, 'task_existing', adjustTaskReminderForQuietHours(nextReminderAt.getTime(), saved.notificationSettings));
    expect(schedule).toHaveBeenNthCalledWith(2, 'task_existing', adjustTaskReminderForQuietHours(previousReminderAt.getTime(), saved.notificationSettings));
    await act(async () => {
      renderer?.unmount();
    });
  });

  it('does not revive a past reminder when quiet hours project future alarms', async () => {
    const now = new Date();
    const startHour = now.getHours();
    const endHour = (startHour + 1) % 24;
    const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
    const existingTask = createTaskRecord(
      {title: 'Past task', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'},
      'task_past',
      new Date().toISOString(),
    );
    existingTask.reminderAtMillis = Date.now() - 60_000;
    const saved = {
      ...emptyAppData(),
      notificationSettings: {
        quietHoursStartLocalTime: formatHour(startHour),
        quietHoursEndLocalTime: formatHour(endHour),
        snoozeDurationMinutes: 60,
      },
      tasks: [existingTask],
    } as AppData;
    const store = {
      load: async () => saved,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const sync = taskReminders.sync as jest.Mock;
    sync.mockClear();
    let renderer: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(createElement(AppStoreProvider, {store}, createElement(() => null)));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(sync).toHaveBeenCalledWith([]);
    await act(async () => {
      renderer?.unmount();
    });
  });

  it('completes a task from a reminder action once and keeps the logical reminder', async () => {
    const task = createTaskRecord(
      {title: 'Complete from reminder', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'},
      'task_action',
      new Date().toISOString(),
    );
    task.reminderAtMillis = Date.now() + 60_000;
    let saved = {...emptyAppData(), tasks: [task]} as AppData;
    const store = {
      load: async () => saved,
      save: async (next: AppData) => {
        saved = next;
      },
    };
    let value: ReturnType<typeof useAppStore> | null = null;
    const Probe = () => {
      value = useAppStore();
      return null;
    };
    let renderer: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(createElement(AppStoreProvider, {store}, createElement(Probe)));
      await Promise.resolve();
      await Promise.resolve();
    });

    const cancel = taskReminders.cancel as jest.Mock;
    cancel.mockClear();
    await act(async () => {
      await value!.completeTaskFromReminder('task_action');
      await value!.completeTaskFromReminder('task_action');
    });

    expect(saved.tasks[0]?.status).toBe('completed');
    expect(saved.tasks[0]?.reminderAtMillis).toBe(task.reminderAtMillis);
    expect(cancel).toHaveBeenCalledTimes(1);
    await act(async () => {
      renderer?.unmount();
    });
  });

  it('snoozes an open reminder for one hour using the quiet-hours projection', async () => {
    const nowMillis = 1_700_000_000_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMillis);
    const task = createTaskRecord(
      {title: 'Snooze from reminder', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'},
      'task_snooze',
      new Date(nowMillis).toISOString(),
    );
    task.reminderAtMillis = nowMillis - 60_000;
    let saved = {
      ...emptyAppData(),
      notificationSettings: {
        quietHoursStartLocalTime: '22:00',
        quietHoursEndLocalTime: '07:00',
        snoozeDurationMinutes: 30,
      },
      tasks: [task],
    } as AppData;
    const store = {
      load: async () => saved,
      save: async (next: AppData) => {
        saved = next;
      },
    };
    let value: ReturnType<typeof useAppStore> | null = null;
    const Probe = () => {
      value = useAppStore();
      return null;
    };
    let renderer: TestRenderer.ReactTestRenderer | undefined;

    try {
      await act(async () => {
        renderer = TestRenderer.create(createElement(AppStoreProvider, {store}, createElement(Probe)));
        await Promise.resolve();
        await Promise.resolve();
      });

      const schedule = taskReminders.schedule as jest.Mock;
      const cancel = taskReminders.cancel as jest.Mock;
      schedule.mockClear();
      cancel.mockClear();
      await act(async () => {
        await value!.snoozeTaskFromReminder('task_snooze');
      });

      const snoozedAtMillis = nowMillis + 30 * 60 * 1000;
      expect(saved.tasks[0]?.reminderAtMillis).toBe(snoozedAtMillis);
      expect(cancel).toHaveBeenCalledWith('task_snooze');
      expect(schedule).toHaveBeenCalledWith('task_snooze', adjustTaskReminderForQuietHours(snoozedAtMillis, saved.notificationSettings));
    } finally {
      nowSpy.mockRestore();
      await act(async () => {
        renderer?.unmount();
      });
    }
  });

  it('ignores snooze actions for missing and completed tasks', async () => {
    const completedTask = createTaskRecord(
      {title: 'Already done', details: '', dueLocalDate: null, priority: 'normal', listId: 'task_list_inbox'},
      'task_completed_snooze',
      new Date().toISOString(),
    );
    completedTask.status = 'completed';
    completedTask.reminderAtMillis = Date.now() - 60_000;
    let saved = {...emptyAppData(), tasks: [completedTask]} as AppData;
    const store = {
      load: async () => saved,
      save: async (next: AppData) => {
        saved = next;
      },
    };
    let value: ReturnType<typeof useAppStore> | null = null;
    const Probe = () => {
      value = useAppStore();
      return null;
    };
    let renderer: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      renderer = TestRenderer.create(createElement(AppStoreProvider, {store}, createElement(Probe)));
      await Promise.resolve();
      await Promise.resolve();
    });

    const schedule = taskReminders.schedule as jest.Mock;
    const cancel = taskReminders.cancel as jest.Mock;
    schedule.mockClear();
    cancel.mockClear();
    await act(async () => {
      await value!.snoozeTaskFromReminder('missing_task');
      await value!.snoozeTaskFromReminder('task_completed_snooze');
    });

    expect(saved.tasks[0]?.status).toBe('completed');
    expect(saved.tasks[0]?.reminderAtMillis).toBe(completedTask.reminderAtMillis);
    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    await act(async () => {
      renderer?.unmount();
    });
  });
});
