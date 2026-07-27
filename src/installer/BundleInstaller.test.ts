import {NativeBundleInstaller} from './BundleInstaller';

describe('NativeBundleInstaller', () => {
  it('uses the embedded baseline when the native bridge is unavailable', async () => {
    await expect(new NativeBundleInstaller(null).launch()).resolves.toEqual({
      kind: 'embedded',
      version: '0.1.0',
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
});
