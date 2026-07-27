export type LaunchAction = 'money' | 'notes' | 'tasks' | 'appTime';

const LAUNCH_ACTIONS: Readonly<Record<string, LaunchAction>> = {
  'dev.yuzuha.OPEN_MONEY': 'money',
  'dev.yuzuha.OPEN_NOTES': 'notes',
  'dev.yuzuha.OPEN_TASKS': 'tasks',
  'dev.yuzuha.OPEN_APP_TIME': 'appTime',
};

export function normalizeLaunchAction(action: unknown): LaunchAction | null {
  return typeof action === 'string' ? LAUNCH_ACTIONS[action] ?? null : null;
}
