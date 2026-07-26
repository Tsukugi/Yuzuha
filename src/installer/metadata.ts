export interface BundleMetadata {
  schema: 1;
  appId: 'yuzuha-mobile';
  platform: 'android' | 'ios';
  runtime: '0.86.0';
  version: string;
  minNativeVersion: string;
  bundleUrl: string;
  sha256: string;
  sizeBytes: number;
  publishedAt: string;
  signature: string;
}

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

export function validateBundleMetadata(value: unknown): BundleMetadata {
  if (!value || typeof value !== 'object') {
    throw new Error('Bundle metadata must be an object.');
  }

  const candidate = value as Partial<BundleMetadata>;
  if (
    candidate.schema !== 1 ||
    candidate.appId !== 'yuzuha-mobile' ||
    (candidate.platform !== 'android' && candidate.platform !== 'ios') ||
    candidate.runtime !== '0.86.0' ||
    typeof candidate.version !== 'string' ||
    !semverPattern.test(candidate.version) ||
    typeof candidate.minNativeVersion !== 'string' ||
    !semverPattern.test(candidate.minNativeVersion) ||
    typeof candidate.bundleUrl !== 'string' ||
    !candidate.bundleUrl.startsWith('https://') ||
    typeof candidate.sha256 !== 'string' ||
    !sha256Pattern.test(candidate.sha256) ||
    typeof candidate.sizeBytes !== 'number' ||
    !Number.isInteger(candidate.sizeBytes) ||
    candidate.sizeBytes <= 0 ||
    typeof candidate.publishedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.publishedAt)) ||
    typeof candidate.signature !== 'string' ||
    candidate.signature.length === 0
  ) {
    throw new Error('Bundle metadata failed schema validation.');
  }

  return candidate as BundleMetadata;
}

