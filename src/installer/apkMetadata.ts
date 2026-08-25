import {isApkReleaseVersion} from './versionPolicy';

export interface NativeUpdateMetadata {
  schema: 1;
  appId: 'yuzuha-mobile';
  platform: 'android';
  version: string;
  versionCode: number;
  apkUrl: string;
  sha256: string;
  sizeBytes: number;
  packageName: 'dev.yuzuha';
  signerSha256: string;
  publishedAt: string;
  signature: string;
}

const sha256Pattern = /^[a-f0-9]{64}$/;
const signaturePattern = /^[A-Za-z0-9+/]{86}==$/;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
export const MAX_APK_BYTES = 256 * 1024 * 1024;

function isImmutableApkUrl(value: string, version: string): boolean {
  try {
    const url = new globalThis.URL(value);
    return url.protocol === 'https:' &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.search.length === 0 &&
      url.hash.length === 0 &&
      (url.pathname.includes(`/${version}/`) || url.pathname.includes(`/v${version}/`)) &&
      url.pathname.endsWith('.apk');
  } catch {
    return false;
  }
}

export function nativeUpdateMetadataSigningPayload(metadata: NativeUpdateMetadata): string {
  return [
    metadata.schema,
    metadata.appId,
    metadata.platform,
    metadata.version,
    metadata.versionCode,
    metadata.apkUrl,
    metadata.sha256,
    metadata.sizeBytes,
    metadata.packageName,
    metadata.signerSha256,
    metadata.publishedAt,
  ].join('\n');
}

export function validateNativeUpdateMetadata(value: unknown): NativeUpdateMetadata {
  if (!value || typeof value !== 'object') {
    throw new Error('Native update metadata must be an object.');
  }
  const candidate = value as Partial<NativeUpdateMetadata>;
  if (
    candidate.schema !== 1 ||
    candidate.appId !== 'yuzuha-mobile' ||
    candidate.platform !== 'android' ||
    typeof candidate.version !== 'string' ||
    !isApkReleaseVersion(candidate.version) ||
    typeof candidate.versionCode !== 'number' ||
    !Number.isSafeInteger(candidate.versionCode) ||
    candidate.versionCode <= 0 ||
    typeof candidate.apkUrl !== 'string' ||
    !isImmutableApkUrl(candidate.apkUrl, candidate.version) ||
    typeof candidate.sha256 !== 'string' ||
    !sha256Pattern.test(candidate.sha256) ||
    typeof candidate.sizeBytes !== 'number' ||
    !Number.isSafeInteger(candidate.sizeBytes) ||
    candidate.sizeBytes <= 0 ||
    candidate.sizeBytes > MAX_APK_BYTES ||
    candidate.packageName !== 'dev.yuzuha' ||
    typeof candidate.signerSha256 !== 'string' ||
    !sha256Pattern.test(candidate.signerSha256) ||
    typeof candidate.publishedAt !== 'string' ||
    !isoTimestampPattern.test(candidate.publishedAt) ||
    Number.isNaN(Date.parse(candidate.publishedAt)) ||
    typeof candidate.signature !== 'string' ||
    !signaturePattern.test(candidate.signature)
  ) {
    throw new Error('Native update metadata failed schema validation.');
  }
  return candidate as NativeUpdateMetadata;
}
