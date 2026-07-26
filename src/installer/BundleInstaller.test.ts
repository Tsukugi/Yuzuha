import {EmbeddedBundleInstaller} from './BundleInstaller';

describe('EmbeddedBundleInstaller', () => {
  it('returns the verified embedded bundle before MainApp is rendered', async () => {
    await expect(new EmbeddedBundleInstaller('0.1.0').launch()).resolves.toEqual({
      kind: 'embedded',
      version: '0.1.0',
    });
  });
});
