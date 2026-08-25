import {compareBundleVersions, isBundleVersion} from './metadata';

type StableVersion = {
  major: string;
  minor: string;
  patch: string;
};

export type AndroidReleaseKind = 'native-baseline' | 'compatible-patch';

function stableVersion(value: string): StableVersion | null {
  if (!isBundleVersion(value) || value.includes('-') || value.includes('+')) {
    return null;
  }
  const [major, minor, patch] = value.split('.');
  return major !== undefined && minor !== undefined && patch !== undefined
    ? {major, minor, patch}
    : null;
}

export function isApkReleaseVersion(value: string): boolean {
  return stableVersion(value) !== null;
}

export function isReleaseKindAllowed(value: string, kind: AndroidReleaseKind): boolean {
  const version = stableVersion(value);
  if (!version) return false;
  return kind === 'native-baseline'
    ? BigInt(version.patch) === 0n
    : BigInt(version.patch) > 0n;
}

export function isOtaVersionForNative(otaVersion: string, nativeVersion: string): boolean {
  const ota = stableVersion(otaVersion);
  const native = stableVersion(nativeVersion);
  return ota !== null &&
    native !== null &&
    ota.major === native.major &&
    ota.minor === native.minor &&
    compareBundleVersions(otaVersion, nativeVersion) > 0;
}

export function isNewerNativeLine(candidateVersion: string, installedNativeVersion: string): boolean {
  const candidate = stableVersion(candidateVersion);
  const installed = stableVersion(installedNativeVersion);
  if (!candidate || !installed) return false;
  if (candidate.major !== installed.major) {
    return BigInt(candidate.major) > BigInt(installed.major);
  }
  return BigInt(candidate.minor) > BigInt(installed.minor);
}
