import {Buffer} from 'node:buffer';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assertNativeReleaseArtifacts, assertReleaseKind, createSignedNativeUpdateMetadata, createUnsignedNativeUpdateMetadata, verifyNativeUpdateMetadataSignature} from './nativeReleaseCore';

describe('native Android release metadata', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'yuzuha-native-release-'));
  });

  afterEach(() => {
    rmSync(directory, {recursive: true, force: true});
  });

  it('rejects a patch release declared as a native baseline', () => {
    expect(() => assertReleaseKind('0.3.4', 'native-baseline')).toThrow('must reset patch to zero');
    expect(() => assertReleaseKind('0.3.0', 'native-baseline')).not.toThrow();
    expect(() => assertReleaseKind('0.3.4', 'compatible-patch')).not.toThrow();
    expect(() => assertReleaseKind('0.3.0', 'compatible-patch')).toThrow('patch greater than zero');
  });

  it('records the exact APK hash and accepts patch APK versions', () => {
    const apkPath = join(directory, 'Yuzuha-0.3.4.apk');
    writeFileSync(apkPath, 'signed apk bytes', 'utf8');

    const metadata = createUnsignedNativeUpdateMetadata({
      apkPath,
      version: '0.3.4',
      versionCode: 14,
      apkUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.3.4/Yuzuha-0.3.4.apk',
      signerSha256: 'b'.repeat(64),
      publishedAt: '2026-08-25T12:00:00.000Z',
    });

    expect(metadata.sizeBytes).toBe(Buffer.byteLength('signed apk bytes'));
    expect(metadata.sha256).toBe('8646fe442192b5d2b5f32e142d780fc5f2b01084702e8b76c33beb7131805736');
    expect(metadata.version).toBe('0.3.4');
  });

  it('rejects a signing key that does not match the pinned update key', () => {
    const apkPath = join(directory, 'Yuzuha-0.3.4.apk');
    writeFileSync(apkPath, 'signed apk bytes', 'utf8');
    const pair = generateKeyPairSync('ed25519');
    const privateKeyBase64 = pair.privateKey.export({format: 'der', type: 'pkcs8'}).toString('base64');

    expect(() => createSignedNativeUpdateMetadata({
      apkPath,
      version: '0.3.4',
      versionCode: 14,
      apkUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.3.4/Yuzuha-0.3.4.apk',
      signerSha256: 'b'.repeat(64),
      publishedAt: '2026-08-25T12:00:00.000Z',
      privateKeyBase64,
    })).toThrow('does not match the pinned public key');
  });

  it('does not accept a placeholder metadata signature', () => {
    const apkPath = join(directory, 'Yuzuha-0.3.4.apk');
    writeFileSync(apkPath, 'signed apk bytes', 'utf8');
    const metadata = {
      ...createUnsignedNativeUpdateMetadata({
        apkPath,
        version: '0.3.4',
        versionCode: 14,
        apkUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.3.4/Yuzuha-0.3.4.apk',
        signerSha256: 'b'.repeat(64),
        publishedAt: '2026-08-25T12:00:00.000Z',
      }),
      signature: `${'A'.repeat(86)}==`,
    };
    expect(verifyNativeUpdateMetadataSignature(metadata)).toBe(false);
  });

  it('requires the APK bytes and version to match native metadata before publication', () => {
    const apkPath = join(directory, 'Yuzuha-0.3.4.apk');
    writeFileSync(apkPath, 'signed apk bytes', 'utf8');
    const metadata = {
      ...createUnsignedNativeUpdateMetadata({
        apkPath,
        version: '0.3.4',
        versionCode: 14,
        apkUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.3.4/Yuzuha-0.3.4.apk',
        signerSha256: 'b'.repeat(64),
        publishedAt: '2026-08-25T12:00:00.000Z',
      }),
      signature: `${'A'.repeat(86)}==`,
    };
    expect(() => assertNativeReleaseArtifacts(metadata, apkPath, '0.3.4', false)).not.toThrow();
    writeFileSync(apkPath, 'changed bytes', 'utf8');
    expect(() => assertNativeReleaseArtifacts(metadata, apkPath, '0.3.4', false)).toThrow('APK bytes do not match');
  });
});
