import {Buffer} from 'node:buffer';
import {createHash, createPrivateKey, createPublicKey, sign, verify} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PINNED_PUBLIC_KEY} from '../src/installer/metadata';
import {isReleaseKindAllowed, type AndroidReleaseKind} from '../src/installer/versionPolicy';
import {
  nativeUpdateMetadataSigningPayload,
  validateNativeUpdateMetadata,
  type NativeUpdateMetadata,
} from '../src/installer/apkMetadata';

export type UnsignedNativeUpdateOptions = {
  apkPath: string;
  version: string;
  versionCode: number;
  apkUrl: string;
  signerSha256: string;
  publishedAt: string;
};

export type SignedNativeUpdateOptions = UnsignedNativeUpdateOptions & {
  privateKeyBase64: string;
};

export function assertReleaseKind(version: string, releaseKind: AndroidReleaseKind): void {
  if (!isReleaseKindAllowed(version, releaseKind)) {
    if (releaseKind === 'native-baseline') {
      throw new Error(`Native baseline ${version} must reset patch to zero.`);
    }
    throw new Error(`Compatible patch ${version} must have a patch greater than zero.`);
  }
}

function privateKeyForPinnedPublicKey(privateKeyBase64: string) {
  if (privateKeyBase64.trim().length === 0) throw new Error('YUZUHA_OTA_PRIVATE_KEY_BASE64 is required.');
  const privateKey = createPrivateKey({key: Buffer.from(privateKeyBase64, 'base64'), format: 'der', type: 'pkcs8'});
  const publicKey = createPublicKey(privateKey).export({format: 'der', type: 'spki'}).toString('base64');
  if (publicKey !== PINNED_PUBLIC_KEY) throw new Error('The native-update private key does not match the pinned public key.');
  return privateKey;
}

export function createUnsignedNativeUpdateMetadata(options: UnsignedNativeUpdateOptions): Omit<NativeUpdateMetadata, 'signature'> {
  const apk = readFileSync(options.apkPath);
  const metadata: Omit<NativeUpdateMetadata, 'signature'> = {
    schema: 1,
    appId: 'yuzuha-mobile',
    platform: 'android',
    version: options.version,
    versionCode: options.versionCode,
    apkUrl: options.apkUrl,
    sha256: createHash('sha256').update(apk).digest('hex'),
    sizeBytes: apk.byteLength,
    packageName: 'dev.yuzuha',
    signerSha256: options.signerSha256.toLowerCase(),
    publishedAt: options.publishedAt,
  };
  validateNativeUpdateMetadata({...metadata, signature: `${'A'.repeat(86)}==`});
  return metadata;
}

export function createSignedNativeUpdateMetadata(options: SignedNativeUpdateOptions): NativeUpdateMetadata {
  const unsigned = createUnsignedNativeUpdateMetadata(options);
  const privateKey = privateKeyForPinnedPublicKey(options.privateKeyBase64);
  const placeholder = {...unsigned, signature: `${'A'.repeat(86)}==`} as NativeUpdateMetadata;
  const signature = sign(null, Buffer.from(nativeUpdateMetadataSigningPayload(placeholder), 'utf8'), privateKey).toString('base64');
  const metadata = validateNativeUpdateMetadata({...unsigned, signature});
  if (!verifyNativeUpdateMetadataSignature(metadata)) throw new Error('The generated native-update metadata signature did not verify.');
  return metadata;
}

export function verifyNativeUpdateMetadataSignature(metadata: NativeUpdateMetadata): boolean {
  const publicKey = createPublicKey({key: Buffer.from(PINNED_PUBLIC_KEY, 'base64'), format: 'der', type: 'spki'});
  return verify(null, Buffer.from(nativeUpdateMetadataSigningPayload(metadata), 'utf8'), publicKey, Buffer.from(metadata.signature, 'base64'));
}

export function assertNativeReleaseArtifacts(
  metadata: NativeUpdateMetadata,
  apkPath: string,
  expectedVersion: string,
  requireValidSignature: boolean = true,
): void {
  if (metadata.version !== expectedVersion) throw new Error('Native metadata version does not match the release version.');
  if (requireValidSignature && !verifyNativeUpdateMetadataSignature(metadata)) throw new Error('Native-update metadata signature is invalid.');
  const apk = readFileSync(apkPath);
  const sha256 = createHash('sha256').update(apk).digest('hex');
  if (apk.byteLength !== metadata.sizeBytes || sha256 !== metadata.sha256) {
    throw new Error('APK bytes do not match native-update metadata.');
  }
  if (!metadata.apkUrl.endsWith(`/v${expectedVersion}/Yuzuha-${expectedVersion}.apk`) &&
      !metadata.apkUrl.endsWith(`/${expectedVersion}/Yuzuha-${expectedVersion}.apk`)) {
    throw new Error('Native metadata APK URL does not match the release version.');
  }
}

export function writeNativeUpdateMetadata(outputDirectory: string, options: SignedNativeUpdateOptions): {metadataPath: string; metadata: NativeUpdateMetadata} {
  const metadata = createSignedNativeUpdateMetadata(options);
  const metadataPath = join(outputDirectory, 'android-update.json');
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return {metadataPath, metadata};
}
