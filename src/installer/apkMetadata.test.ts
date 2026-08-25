import {nativeUpdateMetadataSigningPayload, validateNativeUpdateMetadata} from './apkMetadata';

const validMetadata = {
  schema: 1,
  appId: 'yuzuha-mobile',
  platform: 'android',
  version: '0.2.0',
  versionCode: 6,
  apkUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.2.0/Yuzuha-0.2.0.apk',
  sha256: 'a'.repeat(64),
  sizeBytes: 70_000_000,
  packageName: 'dev.yuzuha',
  signerSha256: 'b'.repeat(64),
  publishedAt: '2026-08-25T12:00:00.000Z',
  signature: `${'A'.repeat(86)}==`,
} as const;

describe('native Android update metadata', () => {
  it('accepts a strict APK release', () => {
    expect(validateNativeUpdateMetadata(validMetadata)).toEqual(validMetadata);
    expect(validateNativeUpdateMetadata({...validMetadata, version: '0.3.4', apkUrl: validMetadata.apkUrl.replaceAll('0.2.0', '0.3.4')})).toBeDefined();
  });

  it('rejects prerelease APK versions', () => {
    expect(() => validateNativeUpdateMetadata({...validMetadata, version: '0.2.1-alpha.1'})).toThrow(
      'Native update metadata failed schema validation.',
    );
  });

  it('rejects mutable, non-APK, and wrong-package artifacts', () => {
    expect(() => validateNativeUpdateMetadata({...validMetadata, apkUrl: 'https://example.test/latest.apk'})).toThrow();
    expect(() => validateNativeUpdateMetadata({...validMetadata, apkUrl: validMetadata.apkUrl.replace('.apk', '.zip')})).toThrow();
    expect(() => validateNativeUpdateMetadata({...validMetadata, packageName: 'dev.example'})).toThrow();
  });

  it('builds one stable signed payload', () => {
    expect(nativeUpdateMetadataSigningPayload(validMetadata)).toBe(
      `1\nyuzuha-mobile\nandroid\n0.2.0\n6\n${validMetadata.apkUrl}\n${'a'.repeat(64)}\n70000000\ndev.yuzuha\n${'b'.repeat(64)}\n2026-08-25T12:00:00.000Z`,
    );
  });
});
