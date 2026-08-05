import {NativeBundleInstaller} from './BundleInstaller';

describe('NativeBundleInstaller', () => {
  it('uses the embedded baseline when the native bridge is unavailable', async () => {
    await expect(new NativeBundleInstaller(null).launch()).resolves.toEqual({
      kind: 'embedded',
      version: '0.1.3',
    });
  });

  it('returns the native verified launch result without downloading in JavaScript', async () => {
    const bridge = {getLaunchStatus: jest.fn().mockResolvedValue({kind: 'remote-activated', version: '0.2.0', reasonCode: 'REMOTE_ACTIVATED'})};
    await expect(new NativeBundleInstaller(bridge).launch()).resolves.toEqual({
      kind: 'remote-activated',
      version: '0.2.0',
      reasonCode: 'REMOTE_ACTIVATED',
    });
    expect(bridge.getLaunchStatus).toHaveBeenCalledTimes(1);
  });

  it('blocks an invalid native result', async () => {
    const bridge = {getLaunchStatus: jest.fn().mockResolvedValue({kind: 'unknown', version: '0.2.0'})};
    await expect(new NativeBundleInstaller(bridge).launch()).resolves.toEqual({
      kind: 'blocked',
      reason: 'The verified bundle status was invalid.',
    });
  });

  it('returns an available update from the native bridge', async () => {
    const bridge = {
      getLaunchStatus: jest.fn().mockResolvedValue({kind: 'local-current', version: '0.1.3'}),
      checkForUpdate: jest.fn().mockResolvedValue({kind: 'available', currentVersion: '0.1.3', availableVersion: '0.2.0'}),
    };
    await expect(new NativeBundleInstaller(bridge).checkForUpdate()).resolves.toEqual({
      kind: 'available',
      currentVersion: '0.1.3',
      availableVersion: '0.2.0',
    });
  });

  it('rejects an invalid native update result', async () => {
    const bridge = {
      getLaunchStatus: jest.fn(),
      checkForUpdate: jest.fn().mockResolvedValue({kind: 'available', currentVersion: '0.1.3', availableVersion: 'not-a-version'}),
    };
    await expect(new NativeBundleInstaller(bridge).checkForUpdate()).resolves.toEqual({
      kind: 'error',
      currentVersion: '0.1.3',
      reasonCode: 'INVALID_NATIVE_RESULT',
    });
  });

  it('rejects an available downgrade from the native bridge', async () => {
    const bridge = {
      getLaunchStatus: jest.fn(),
      checkForUpdate: jest.fn().mockResolvedValue({kind: 'available', currentVersion: '0.2.0', availableVersion: '0.1.9'}),
    };
    await expect(new NativeBundleInstaller(bridge).checkForUpdate()).resolves.toEqual({
      kind: 'error',
      currentVersion: '0.1.3',
      reasonCode: 'INVALID_NATIVE_RESULT',
    });
  });

  it('does not mark a launch when the native bridge is unavailable', async () => {
    const bridge = {
      getLaunchStatus: jest.fn(),
    };
    await expect(new NativeBundleInstaller(bridge).markLaunchSuccessful()).resolves.toBeUndefined();
  });
});
