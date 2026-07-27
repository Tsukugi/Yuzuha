import {createElement} from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {emptyAppData, type AppData} from '../types/domain';
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
});
