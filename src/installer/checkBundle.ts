import {readFileSync} from 'node:fs';
import {validateBundleMetadata, type BundleMetadata} from './metadata';

const defaultMetadata: BundleMetadata = {
  schema: 1,
  appId: 'yuzuha-mobile',
  platform: 'android',
  runtime: '0.86.0',
  version: '0.1.0',
  minNativeVersion: '0.1.0',
  bundleUrl: 'https://updates.yuzuha.dev/bundles/android/0.1.0/main.jsbundle',
  sha256: '0000000000000000000000000000000000000000000000000000000000000000',
  sizeBytes: 1,
  publishedAt: '2026-07-26T00:00:00.000Z',
  signature: 'development-fixture',
};

function readMetadata(): unknown {
  const file = process.env.BUNDLE_METADATA_FILE;
  if (!file) {
    return defaultMetadata;
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function checkBundleMetadata(value: unknown): BundleMetadata {
  return validateBundleMetadata(value);
}

if (process.argv[1]?.endsWith('checkBundle.ts')) {
  try {
    const metadata = checkBundleMetadata(readMetadata());
    console.log(`Bundle metadata valid: ${metadata.platform} ${metadata.version}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Bundle metadata check failed.');
    process.exitCode = 1;
  }
}
