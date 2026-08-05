import {Buffer} from 'node:buffer';
import {createHash, createPrivateKey, createPublicKey, sign, verify} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync, statSync} from 'node:fs';
import {basename, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {
  BUNDLE_NATIVE_VERSION,
  BUNDLE_RUNTIME,
  EMBEDDED_BUNDLE_VERSION,
  PINNED_PUBLIC_KEY,
  bundleMetadataSigningPayload,
  compareBundleVersions,
  isBundleVersion,
  validateBundleMetadata,
  type BundleMetadata,
} from '../src/installer/metadata';

export type ReleaseOptions = {
  projectRoot: string;
  version: string;
  bundleUrl: string;
  outputRoot: string;
  publishedAt: string;
  privateKeyBase64: string;
};

export type ReactNativeBundleCommand = {
  executable: string;
  args: string[];
};

const statSafe = (path: string) => {
  try {
    return statSync(path);
  } catch {
    return null;
  }
};

const listFiles = (directory: string): string[] => {
  if (!statSafe(directory)?.isDirectory()) return [];
  const files: string[] = [];
  const visit = (current: string) => {
    for (const entry of readdirSync(current, {withFileTypes: true})) {
      const entryPath = join(current, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  };
  visit(directory);
  return files.sort();
};

const publicKeyFromPrivateKey = (privateKeyBase64: string) => {
  if (privateKeyBase64.trim().length === 0) {
    throw new Error('YUZUHA_OTA_PRIVATE_KEY_BASE64 is required.');
  }
  const privateKey = createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  const publicKey = createPublicKey(privateKey).export({format: 'der', type: 'spki'}).toString('base64');
  if (publicKey !== PINNED_PUBLIC_KEY) {
    throw new Error('The OTA private key does not match the pinned public key.');
  }
  return privateKey;
};

export function verifyBundleMetadataSignature(metadata: BundleMetadata): boolean {
  const publicKey = createPublicKey({
    key: Buffer.from(PINNED_PUBLIC_KEY, 'base64'),
    format: 'der',
    type: 'spki',
  });
  return verify(
    null,
    Buffer.from(bundleMetadataSigningPayload(metadata), 'utf8'),
    publicKey,
    Buffer.from(metadata.signature, 'base64'),
  );
}

export function createSignedBundleMetadata(
  bundlePath: string,
  version: string,
  bundleUrl: string,
  publishedAt: string,
  privateKeyBase64: string,
): BundleMetadata {
  const unsigned = createUnsignedBundleMetadata(bundlePath, version, bundleUrl, publishedAt);
  const privateKey = publicKeyFromPrivateKey(privateKeyBase64);
  const payload = bundleMetadataSigningPayload({...unsigned, signature: `${'A'.repeat(86)}==`});
  const signature = sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');
  const metadata = {...unsigned, signature};
  validateBundleMetadata(metadata);
  if (!verifyBundleMetadataSignature(metadata)) {
    throw new Error('The generated OTA metadata signature did not verify.');
  }
  return metadata;
}

export function createUnsignedBundleMetadata(
  bundlePath: string,
  version: string,
  bundleUrl: string,
  publishedAt: string,
): Omit<BundleMetadata, 'signature'> {
  if (!isBundleVersion(version)) throw new Error(`Invalid OTA version: ${version}`);
  if (compareBundleVersions(version, EMBEDDED_BUNDLE_VERSION) <= 0) {
    throw new Error(`OTA version ${version} must be newer than ${EMBEDDED_BUNDLE_VERSION}.`);
  }
  const bundle = readFileSync(bundlePath);
  const unsigned: Omit<BundleMetadata, 'signature'> = {
    schema: 1,
    appId: 'yuzuha-mobile',
    platform: 'android',
    runtime: BUNDLE_RUNTIME,
    version,
    minNativeVersion: BUNDLE_NATIVE_VERSION,
    bundleUrl,
    sha256: createHash('sha256').update(bundle).digest('hex'),
    sizeBytes: bundle.byteLength,
    publishedAt,
  };
  validateBundleMetadata({...unsigned, signature: `${'A'.repeat(86)}==`});
  return unsigned;
}

export function createReactNativeBundleCommand(
  projectRoot: string,
  bundlePath: string,
  assetsDirectory: string,
): ReactNativeBundleCommand {
  // Invoke the checked-in React Native CLI with the current Node runtime.
  // Calling npx.cmd through execFileSync fails with EINVAL on Windows.
  const reactNativeCli = join(projectRoot, 'node_modules', 'react-native', 'cli.js');
  return {
    executable: process.execPath,
    args: [
      reactNativeCli,
      'bundle',
      '--entry-file',
      'index.js',
      '--platform',
      'android',
      '--dev',
      'false',
      '--minify',
      'true',
      '--bundle-output',
      bundlePath,
      '--assets-dest',
      assetsDirectory,
    ],
  };
}

const buildBundle = (projectRoot: string, versionDirectory: string): string => {
  const version = basename(versionDirectory);
  const bundlePath = join(versionDirectory, `Yuzuha-${version}.jsbundle`);
  const assetsDirectory = join(versionDirectory, 'assets');
  mkdirSync(assetsDirectory, {recursive: true});
  const command = createReactNativeBundleCommand(projectRoot, bundlePath, assetsDirectory);
  execFileSync(command.executable, command.args, {cwd: projectRoot, stdio: 'inherit'});
  const assetFiles = listFiles(assetsDirectory);
  if (assetFiles.length > 0) {
    throw new Error(`OTA bundle requires unsupported Metro assets: ${assetFiles.map(file => relative(assetsDirectory, file)).join(', ')}`);
  }
  rmSync(assetsDirectory, {recursive: true, force: true});
  return bundlePath;
};

export function buildOtaRelease(options: ReleaseOptions): {metadataPath: string; bundlePath: string; metadata: BundleMetadata} {
  if (!isBundleVersion(options.version)) {
    throw new Error(`Invalid OTA version: ${options.version}`);
  }
  const outputRoot = resolve(options.outputRoot);
  const versionDirectory = resolve(outputRoot, options.version);
  const relativeVersionDirectory = relative(outputRoot, versionDirectory);
  if (
    relativeVersionDirectory.length === 0 ||
    isAbsolute(relativeVersionDirectory) ||
    relativeVersionDirectory === '..' ||
    relativeVersionDirectory.startsWith(`..${sep}`)
  ) {
    throw new Error('OTA staging directory must remain inside outputRoot.');
  }
  rmSync(versionDirectory, {recursive: true, force: true});
  mkdirSync(versionDirectory, {recursive: true});
  const bundlePath = buildBundle(options.projectRoot, versionDirectory);
  const metadata = createSignedBundleMetadata(bundlePath, options.version, options.bundleUrl, options.publishedAt, options.privateKeyBase64);
  const metadataPath = join(versionDirectory, 'bundle.json');
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return {metadataPath, bundlePath, metadata};
}
