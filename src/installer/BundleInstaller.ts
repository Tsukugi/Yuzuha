export type LaunchDecision =
  | {kind: 'embedded'; version: string}
  | {kind: 'blocked'; reason: string};

export interface BundleInstaller {
  launch(): Promise<LaunchDecision>;
}

/**
 * Phase 0 gate. The native shell currently ships one embedded bundle, so it is
 * the only safe executable candidate. Remote activation is added with the
 * native update bridge in the installer phase and must not be faked in JS.
 */
export class EmbeddedBundleInstaller implements BundleInstaller {
  constructor(private readonly version = '0.1.0') {}

  async launch(): Promise<LaunchDecision> {
    return {kind: 'embedded', version: this.version};
  }
}

