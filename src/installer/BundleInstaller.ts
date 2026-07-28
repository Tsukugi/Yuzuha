import {NativeModules} from 'react-native';

export type LaunchDecision =
  | {kind: 'remote-activated' | 'local-current' | 'offline-local' | 'invalid-remote' | 'embedded'; version: string; reasonCode?: string}
  | {kind: 'blocked'; reason: string};

export interface BundleInstaller {
  launch(): Promise<LaunchDecision>;
}

export interface NativeInstallerBridge {
  getLaunchStatus(): Promise<{kind: string; version: string; reasonCode?: string}>;
}

const allowedKinds = new Set(['remote-activated', 'local-current', 'offline-local', 'invalid-remote', 'embedded']);

/**
 * The native shell has already selected a verified bundle before React starts.
 * This bridge only reads the typed launch result; it never downloads or
 * activates JavaScript from the JS thread.
 */
export class NativeBundleInstaller implements BundleInstaller {
  constructor(private readonly bridge: NativeInstallerBridge | null = NativeModules.YuzuhaInstaller) {}

  async launch(): Promise<LaunchDecision> {
    if (!this.bridge) {
      return {kind: 'embedded', version: '0.1.2'};
    }
    try {
      const status = await this.bridge.getLaunchStatus();
      if (!allowedKinds.has(status.kind) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(status.version)) {
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
}
