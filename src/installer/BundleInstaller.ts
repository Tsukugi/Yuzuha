import {NativeModules} from 'react-native';
import {compareBundleVersions, isBundleVersion} from './metadata';

export const EMBEDDED_BUNDLE_VERSION = '0.1.3';

export type LaunchDecision =
  | {kind: 'remote-activated' | 'local-current' | 'offline-local' | 'invalid-remote' | 'embedded'; version: string; reasonCode?: string}
  | {kind: 'blocked'; reason: string};

export type UpdateCheckResult =
  | {kind: 'current'; currentVersion: string; reasonCode?: string}
  | {kind: 'available'; currentVersion: string; availableVersion: string}
  | {kind: 'prepared'; currentVersion: string; availableVersion: string}
  | {kind: 'error'; currentVersion: string; reasonCode: string}
  | {kind: 'unavailable'; currentVersion: string};

export interface BundleInstaller {
  launch(): Promise<LaunchDecision>;
  checkForUpdate(): Promise<UpdateCheckResult>;
  downloadUpdate(): Promise<UpdateCheckResult>;
  markLaunchSuccessful(): Promise<void>;
}

export interface NativeInstallerBridge {
  getLaunchStatus(): Promise<{kind: string; version: string; reasonCode?: string}>;
  checkForUpdate?: () => Promise<unknown>;
  downloadUpdate?: () => Promise<unknown>;
  markLaunchSuccessful?: () => Promise<void>;
}

const allowedLaunchKinds = new Set(['remote-activated', 'local-current', 'offline-local', 'invalid-remote', 'embedded']);
const isVersion = (value: unknown): value is string => typeof value === 'string' && isBundleVersion(value);

const invalidUpdateResult = (currentVersion: string): UpdateCheckResult => ({
  kind: 'error',
  currentVersion,
  reasonCode: 'INVALID_NATIVE_RESULT',
});

function parseUpdateResult(value: unknown): UpdateCheckResult | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const result = value as Record<string, unknown>;
  if (!isVersion(result.currentVersion)) {
    return null;
  }
  if (result.kind === 'current') {
    return {
      kind: 'current',
      currentVersion: result.currentVersion,
      ...(typeof result.reasonCode === 'string' ? {reasonCode: result.reasonCode} : {}),
    };
  }
  if (result.kind === 'available' && isVersion(result.availableVersion) && compareBundleVersions(result.availableVersion, result.currentVersion) > 0) {
    return {kind: 'available', currentVersion: result.currentVersion, availableVersion: result.availableVersion};
  }
  if (result.kind === 'prepared' && isVersion(result.availableVersion) && compareBundleVersions(result.availableVersion, result.currentVersion) > 0) {
    return {kind: 'prepared', currentVersion: result.currentVersion, availableVersion: result.availableVersion};
  }
  if (result.kind === 'error' && typeof result.reasonCode === 'string' && result.reasonCode.length > 0) {
    return {kind: 'error', currentVersion: result.currentVersion, reasonCode: result.reasonCode};
  }
  return null;
}

/**
 * The native shell selects and verifies bundles before React starts. This
 * bridge reads launch state and asks native code to prepare later updates; it
 * never downloads or activates executable JavaScript on the JS thread.
 */
export class NativeBundleInstaller implements BundleInstaller {
  constructor(private readonly bridge: NativeInstallerBridge | null = NativeModules.YuzuhaInstaller) {}

  async launch(): Promise<LaunchDecision> {
    if (!this.bridge) {
      return {kind: 'embedded', version: EMBEDDED_BUNDLE_VERSION};
    }
    try {
      const status = await this.bridge.getLaunchStatus();
      if (!allowedLaunchKinds.has(status.kind) || !isVersion(status.version)) {
        return {kind: 'blocked', reason: 'The verified bundle status was invalid.'};
      }
      return {
        kind: status.kind as Exclude<LaunchDecision, {kind: 'blocked'}>['kind'],
        version: status.version,
        ...(status.reasonCode ? {reasonCode: status.reasonCode} : {}),
      };
    } catch {
      return {kind: 'blocked', reason: 'The verified bundle status could not be read.'};
    }
  }

  async checkForUpdate(): Promise<UpdateCheckResult> {
    if (!this.bridge?.checkForUpdate) {
      return {kind: 'unavailable', currentVersion: EMBEDDED_BUNDLE_VERSION};
    }
    try {
      const result = parseUpdateResult(await this.bridge.checkForUpdate());
      return result ?? invalidUpdateResult(EMBEDDED_BUNDLE_VERSION);
    } catch {
      return {kind: 'error', currentVersion: EMBEDDED_BUNDLE_VERSION, reasonCode: 'BRIDGE_CHECK_FAILED'};
    }
  }

  async downloadUpdate(): Promise<UpdateCheckResult> {
    if (!this.bridge?.downloadUpdate) {
      return {kind: 'unavailable', currentVersion: EMBEDDED_BUNDLE_VERSION};
    }
    try {
      const result = parseUpdateResult(await this.bridge.downloadUpdate());
      return result ?? invalidUpdateResult(EMBEDDED_BUNDLE_VERSION);
    } catch {
      return {kind: 'error', currentVersion: EMBEDDED_BUNDLE_VERSION, reasonCode: 'BRIDGE_DOWNLOAD_FAILED'};
    }
  }

  async markLaunchSuccessful(): Promise<void> {
    if (this.bridge?.markLaunchSuccessful) {
      await this.bridge.markLaunchSuccessful();
    }
  }
}

export const nativeBundleInstaller = new NativeBundleInstaller();
