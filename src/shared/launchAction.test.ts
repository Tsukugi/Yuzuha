import {normalizeLaunchAction, type LaunchAction} from './launchAction';

describe('launcher action contract', () => {
  it('maps every supported action to an existing tab', () => {
    const actions = [
      'dev.yuzuha.OPEN_MONEY',
      'dev.yuzuha.OPEN_NOTES',
      'dev.yuzuha.OPEN_TASKS',
      'dev.yuzuha.OPEN_APP_TIME',
    ];
    const tabs: LaunchAction[] = ['money', 'notes', 'tasks', 'appTime'];
    expect(actions.map(normalizeLaunchAction)).toEqual(tabs);
  });

  it('rejects unknown, empty, and non-string actions', () => {
    expect(normalizeLaunchAction('dev.yuzuha.OPEN_SETTINGS')).toBeNull();
    expect(normalizeLaunchAction('')).toBeNull();
    expect(normalizeLaunchAction(null)).toBeNull();
    expect(normalizeLaunchAction(42)).toBeNull();
  });
});
