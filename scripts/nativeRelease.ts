import {mkdirSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {validateNativeUpdateMetadata} from '../src/installer/apkMetadata';
import {assertReleaseKind, verifyNativeUpdateMetadataSignature, writeNativeUpdateMetadata} from './nativeReleaseCore';
import type {AndroidReleaseKind} from '../src/installer/versionPolicy';

const argumentValue = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

function required(args: string[], name: string): string {
  const value = argumentValue(args, name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    const path = resolve(required(args, '--check'));
    const metadata = validateNativeUpdateMetadata(JSON.parse(readFileSync(path, 'utf8')));
    if (!verifyNativeUpdateMetadataSignature(metadata)) throw new Error('Native-update metadata signature is invalid.');
    console.log(`Native-update metadata valid: ${metadata.version} (${metadata.versionCode})`);
    return;
  }
  const version = required(args, '--version');
  const releaseKind = required(args, '--release-kind');
  if (releaseKind !== 'native-baseline' && releaseKind !== 'compatible-patch') {
    throw new Error('--release-kind must be native-baseline or compatible-patch.');
  }
  assertReleaseKind(version, releaseKind as AndroidReleaseKind);
  const apkPath = resolve(required(args, '--apk'));
  const versionCode = Number(required(args, '--version-code'));
  const signerSha256 = required(args, '--signer-sha256');
  const apkUrl = argumentValue(args, '--apk-url') ?? `https://github.com/Tsukugi/Yuzuha/releases/download/v${version}/Yuzuha-${version}.apk`;
  const outputDirectory = resolve(argumentValue(args, '--output') ?? dirname(apkPath));
  mkdirSync(outputDirectory, {recursive: true});
  const result = writeNativeUpdateMetadata(outputDirectory, {
    apkPath,
    version,
    versionCode,
    apkUrl,
    signerSha256,
    publishedAt: argumentValue(args, '--published-at') ?? new Date().toISOString(),
    privateKeyBase64: process.env.YUZUHA_OTA_PRIVATE_KEY_BASE64 ?? '',
  });
  if (args.includes('--upload')) throw new Error('Use ota-release --upload so the APK and OTA delivery forms are published together.');
  console.log(`Native-update metadata ready: ${result.metadataPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Native release metadata failed.');
  process.exitCode = 1;
}
