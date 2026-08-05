export interface BundleMetadata {
  schema: 1;
  appId: 'yuzuha-mobile';
  platform: 'android';
  runtime: '0.86.0';
  version: string;
  minNativeVersion: string;
  bundleUrl: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
  signature: string;
}

export const BUNDLE_RUNTIME = '0.86.0' as const;
export const BUNDLE_NATIVE_VERSION = '0.1.3' as const;
export const EMBEDDED_BUNDLE_VERSION = '0.1.3' as const;
export const PINNED_PUBLIC_KEY = 'MCowBQYDK2VwAyEAHtg4xjISeTsnO7iXTHPfyv6MTBQvEKcbYXot6em3V8s=' as const;

const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const signaturePattern = /^[A-Za-z0-9+/]{86}==$/;
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

export function isBundleVersion(value: string): boolean {
  const match = semverPattern.exec(value);
  if (!match) return false;
  const prerelease = match[4];
  return prerelease === undefined || prerelease.split('.').every(identifier => {
    return !/^\d+$/.test(identifier) || identifier === '0' || !identifier.startsWith('0');
  });
}

function versionParts(value: string): {core: string[]; prerelease: string[]} {
  const withoutBuild = value.split('+', 1)[0];
  const [coreText, prereleaseText] = withoutBuild.split('-', 2);
  return {
    core: coreText.split('.'),
    prerelease: prereleaseText ? prereleaseText.split('.') : [],
  };
}

function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;
    const leftNumber = /^\d+$/.test(leftPart) ? BigInt(leftPart) : null;
    const rightNumber = /^\d+$/.test(rightPart) ? BigInt(rightPart) : null;
    if (leftNumber !== null && rightNumber !== null) return leftNumber < rightNumber ? -1 : 1;
    if (leftNumber !== null) return -1;
    if (rightNumber !== null) return 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
}

export function compareBundleVersions(left: string, right: string): number {
  if (!isBundleVersion(left) || !isBundleVersion(right)) {
    throw new Error('Cannot compare invalid bundle versions.');
  }
  const leftVersion = versionParts(left);
  const rightVersion = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    const leftCore = BigInt(leftVersion.core[index]);
    const rightCore = BigInt(rightVersion.core[index]);
    if (leftCore !== rightCore) {
      return leftCore < rightCore ? -1 : 1;
    }
  }
  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}

export function bundleMetadataSigningPayload(metadata: BundleMetadata): string {
  return [
    metadata.schema,
    metadata.appId,
    metadata.platform,
    metadata.runtime,
    metadata.version,
    metadata.minNativeVersion,
    metadata.bundleUrl,
    metadata.sha256,
    metadata.sizeBytes,
    metadata.publishedAt,
  ].join('\n');
}

export function validateBundleMetadata(value: unknown): BundleMetadata {
  if (!value || typeof value !== 'object') {
    throw new Error('Bundle metadata must be an object.');
  }

  const candidate = value as Partial<BundleMetadata>;
  if (
    candidate.schema !== 1 ||
    candidate.appId !== 'yuzuha-mobile' ||
    candidate.platform !== 'android' ||
    candidate.runtime !== BUNDLE_RUNTIME ||
    typeof candidate.version !== 'string' ||
    !isBundleVersion(candidate.version) ||
    typeof candidate.minNativeVersion !== 'string' ||
    !isBundleVersion(candidate.minNativeVersion) ||
    typeof candidate.bundleUrl !== 'string' ||
    !isImmutableBundleUrl(candidate.bundleUrl, candidate.version) ||
    typeof candidate.sha256 !== 'string' ||
    !sha256Pattern.test(candidate.sha256) ||
    typeof candidate.sizeBytes !== 'number' ||
    !Number.isInteger(candidate.sizeBytes) ||
    candidate.sizeBytes <= 0 ||
    candidate.sizeBytes > 64 * 1024 * 1024 ||
    typeof candidate.publishedAt !== 'string' ||
    !isoTimestampPattern.test(candidate.publishedAt) ||
    Number.isNaN(Date.parse(candidate.publishedAt)) ||
    typeof candidate.signature !== 'string' ||
    !signaturePattern.test(candidate.signature)
  ) {
    throw new Error('Bundle metadata failed schema validation.');
  }

  return candidate as BundleMetadata;
}

function isImmutableBundleUrl(value: string, version: string): boolean {
  try {
    const url = new globalThis.URL(value);
    return url.protocol === 'https:' &&
      url.username.length === 0 &&
      url.password.length === 0 &&
      url.search.length === 0 &&
      url.hash.length === 0 &&
      (url.pathname.includes(`/${version}/`) || url.pathname.includes(`/v${version}/`)) &&
      url.pathname.endsWith('.jsbundle');
  } catch {
    return false;
  }
}
