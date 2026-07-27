import {normalizeDeepLink, type DeepLinkTarget} from './deepLink';

describe('deep-link contract', () => {
  it('maps every supported route to an existing tab', () => {
    const links = [
      'yuzuha://open/money',
      'yuzuha://open/notes',
      'yuzuha://open/tasks',
      'yuzuha://open/app-time',
    ];
    const targets: DeepLinkTarget[] = ['money', 'notes', 'tasks', 'appTime'];
    expect(links.map(normalizeDeepLink)).toEqual(targets);
  });

  it('rejects query data, remote hosts, extra paths, and non-strings', () => {
    expect(normalizeDeepLink('yuzuha://open/tasks?taskId=secret')).toBeNull();
    expect(normalizeDeepLink('yuzuha://other/tasks')).toBeNull();
    expect(normalizeDeepLink('yuzuha://open/tasks/123')).toBeNull();
    expect(normalizeDeepLink(' yuzuha://open/tasks')).toBeNull();
    expect(normalizeDeepLink(null)).toBeNull();
    expect(normalizeDeepLink(42)).toBeNull();
  });
});
