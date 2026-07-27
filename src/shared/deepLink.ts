export type DeepLinkTarget = 'money' | 'notes' | 'tasks' | 'appTime';

const DEEP_LINK_TARGETS: Readonly<Record<string, DeepLinkTarget>> = {
  'yuzuha://open/money': 'money',
  'yuzuha://open/notes': 'notes',
  'yuzuha://open/tasks': 'tasks',
  'yuzuha://open/app-time': 'appTime',
};

export function normalizeDeepLink(value: unknown): DeepLinkTarget | null {
  return typeof value === 'string' ? DEEP_LINK_TARGETS[value] ?? null : null;
}
