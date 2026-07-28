import {bundleMetadataSigningPayload, validateBundleMetadata} from './metadata';

const validMetadata = {
  schema: 1,
  appId: 'yuzuha-mobile',
  platform: 'android',
  runtime: '0.86.0',
  version: '0.1.1',
  minNativeVersion: '0.1.1',
  bundleUrl: 'https://updates.yuzuha.dev/bundles/android/0.1.1/main.jsbundle',
  sha256: 'a'.repeat(64),
  sizeBytes: 100,
  publishedAt: '2026-07-26T00:00:00.000Z',
  signature: `${'A'.repeat(86)}==`,
} as const;

describe('bundle metadata', () => {
  it('accepts a compatible signed release shape', () => {
    expect(validateBundleMetadata(validMetadata)).toEqual(validMetadata);
  });

  it('rejects non-HTTPS bundle URLs', () => {
    expect(() => validateBundleMetadata({...validMetadata, bundleUrl: 'http://example.test/bundle'})).toThrow(
      'Bundle metadata failed schema validation.',
    );
  });

  it('rejects a wrong runtime', () => {
    expect(() => validateBundleMetadata({...validMetadata, runtime: '0.83.0'})).toThrow(
      'Bundle metadata failed schema validation.',
    );
  });

  it('builds one stable signing payload', () => {
    expect(bundleMetadataSigningPayload(validMetadata)).toBe(
      '1\nyuzuha-mobile\nandroid\n0.86.0\n0.1.1\n0.1.1\nhttps://updates.yuzuha.dev/bundles/android/0.1.1/main.jsbundle\n' +
        `${'a'.repeat(64)}\n100\n2026-07-26T00:00:00.000Z`,
    );
  });
});
