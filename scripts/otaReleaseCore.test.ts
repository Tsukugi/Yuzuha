import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {Buffer} from 'node:buffer';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {
  buildOtaRelease,
  createSignedBundleMetadata,
  createReactNativeBundleCommand,
  createUnsignedBundleMetadata,
  verifyBundleMetadataSignature,
} from './otaReleaseCore';

describe('OTA release core', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'yuzuha-ota-'));
  });

  afterEach(() => {
    rmSync(directory, {recursive: true, force: true});
  });

  it('records the exact bundle hash and byte size', () => {
    const bundlePath = join(directory, 'bundle.jsbundle');
    writeFileSync(bundlePath, 'bundle bytes', 'utf8');
    const metadata = createUnsignedBundleMetadata(
      bundlePath,
      '0.2.0',
      'https://github.com/Tsukugi/Yuzuha/releases/download/v0.2.0/Yuzuha-0.2.0.jsbundle',
      '2026-08-05T12:00:00.000Z',
    );
    expect(metadata.sizeBytes).toBe(Buffer.byteLength('bundle bytes'));
    expect(metadata.sha256).toBe('f40a912044d47ea7c32f37340db4fd5eb853ffb8fcd983f605d9eb4f8b02fbc2');
  });

  it('runs the local React Native CLI through Node on Windows-safe paths', () => {
    const bundlePath = join(directory, '0.2.0', 'Yuzuha-0.2.0.jsbundle');
    const assetsDirectory = join(directory, '0.2.0', 'assets');
    const command = createReactNativeBundleCommand(directory, bundlePath, assetsDirectory);

    expect(command.executable).toBe(process.execPath);
    expect(command.args[0]).toBe(join(directory, 'node_modules', 'react-native', 'cli.js'));
    expect(command.args[1]).toBe('bundle');
    expect(command.args).toEqual(expect.arrayContaining([
      '--bundle-output',
      bundlePath,
      '--assets-dest',
      assetsDirectory,
    ]));
    expect(command.args).not.toContain('npx.cmd');
  });

  it('rejects a production signing key that does not match the pinned key', () => {
    const bundlePath = join(directory, 'bundle.jsbundle');
    writeFileSync(bundlePath, 'bundle bytes', 'utf8');
    const pair = generateKeyPairSync('ed25519');
    const privateKey = pair.privateKey.export({format: 'der', type: 'pkcs8'}).toString('base64');
    expect(() => createSignedBundleMetadata(
      bundlePath,
      '0.2.0',
      'https://github.com/Tsukugi/Yuzuha/releases/download/v0.2.0/Yuzuha-0.2.0.jsbundle',
      '2026-08-05T12:00:00.000Z',
      privateKey,
    )).toThrow('does not match the pinned public key');
  });

  it('rejects a metadata signature that does not verify', () => {
    const metadata = {
      schema: 1 as const,
      appId: 'yuzuha-mobile' as const,
      platform: 'android' as const,
      runtime: '0.86.0' as const,
      version: '0.2.0',
      minNativeVersion: '0.1.3',
      bundleUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.2.0/Yuzuha-0.2.0.jsbundle',
      sha256: 'a'.repeat(64),
      sizeBytes: 1,
      publishedAt: '2026-08-05T12:00:00.000Z',
      signature: `${'A'.repeat(86)}==`,
    };
    expect(verifyBundleMetadataSignature(metadata)).toBe(false);
  });

  it('rejects an invalid version before touching the staging directory', () => {
    expect(() => buildOtaRelease({
      projectRoot: directory,
      version: '../../outside',
      bundleUrl: 'https://github.com/Tsukugi/Yuzuha/releases/download/v0.2.0/Yuzuha-0.2.0.jsbundle',
      outputRoot: join(directory, 'ota'),
      publishedAt: '2026-08-05T12:00:00.000Z',
      privateKeyBase64: '',
    })).toThrow('Invalid OTA version');
  });
});
