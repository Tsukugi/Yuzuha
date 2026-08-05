import {bundleMetadataSigningPayload, compareBundleVersions, isBundleVersion, validateBundleMetadata} from './metadata';

const validMetadata = {
  schema: 1,
  appId: 'yuzuha-mobile',
  platform: 'android',
  runtime: '0.86.0',
  version: '0.1.3',
  minNativeVersion: '0.1.3',
  bundleUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.1.3/Yuzuha-0.1.3.jsbundle',
  sha256: 'a'.repeat(64),
  sizeBytes: 100,
  publishedAt: '2026-07-26T00:00:00.000Z',
  signature: `${'A'.repeat(86)}==`,
} as const;

describe('bundle metadata', () => {
  it('accepts a compatible signed release shape', () => {
    expect(validateBundleMetadata(validMetadata)).toEqual(validMetadata);
  });

  it('accepts the documented GitHub release version path', () => {
    const githubMetadata = {
      ...validMetadata,
      bundleUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.1.3/Yuzuha-0.1.3.jsbundle',
    };
    expect(validateBundleMetadata(githubMetadata)).toEqual(githubMetadata);
  });

  it('rejects non-HTTPS bundle URLs', () => {
    expect(() => validateBundleMetadata({...validMetadata, bundleUrl: 'http://example.test/bundle'})).toThrow(
      'Bundle metadata failed schema validation.',
    );
  });

  it('rejects mutable bundle URLs', () => {
    expect(() => validateBundleMetadata({...validMetadata, bundleUrl: 'https://example.test/latest.jsbundle'})).toThrow(
      'Bundle metadata failed schema validation.',
    );
  });

  it('rejects leading-zero release versions', () => {
    expect(() => validateBundleMetadata({...validMetadata, version: '01.2.3'})).toThrow(
      'Bundle metadata failed schema validation.',
    );
  });

  it('rejects a wrong runtime', () => {
    expect(() => validateBundleMetadata({...validMetadata, runtime: '0.83.0'})).toThrow(
      'Bundle metadata failed schema validation.',
    );
  });

  it('rejects timestamps without a timezone and complete time', () => {
    expect(() => validateBundleMetadata({...validMetadata, publishedAt: '2026-07-26'})).toThrow(
      'Bundle metadata failed schema validation.',
    );
  });

  it('builds one stable signing payload', () => {
    expect(bundleMetadataSigningPayload(validMetadata)).toBe(
      '1\nyuzuha-mobile\nandroid\n0.86.0\n0.1.3\n0.1.3\nhttps://github.com/Tsukugi/Yuzuha/releases/download/v0.1.3/Yuzuha-0.1.3.jsbundle\n' +
        `${'a'.repeat(64)}\n100\n2026-07-26T00:00:00.000Z`,
    );
  });

  it('compares release versions and prereleases', () => {
    expect(compareBundleVersions('0.2.0', '0.1.9')).toBeGreaterThan(0);
    expect(compareBundleVersions('0.2.0-alpha.2', '0.2.0-alpha.10')).toBeLessThan(0);
    expect(compareBundleVersions('0.2.0', '0.2.0+build.1')).toBe(0);
  });

  it('enforces strict numeric prerelease identifiers and exact core comparison', () => {
    expect(isBundleVersion('0.2.0-alpha.1')).toBe(true);
    expect(isBundleVersion('0.2.0-alpha.01')).toBe(false);
    expect(isBundleVersion('0.2.0-01')).toBe(false);
    expect(compareBundleVersions('999999999999999999999.0.0', '10000000000000000000.0.0')).toBeGreaterThan(0);
    expect(compareBundleVersions('0.2.0-alpha.999999999999999999999', '0.2.0-alpha.1000000000000000000000')).toBeLessThan(0);
  });
});
