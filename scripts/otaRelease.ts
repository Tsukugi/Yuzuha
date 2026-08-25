import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildOtaRelease, verifyBundleMetadataSignature} from './otaReleaseCore';
import {validateBundleMetadata} from '../src/installer/metadata';
import {validateNativeUpdateMetadata} from '../src/installer/apkMetadata';
import {assertNativeReleaseArtifacts} from './nativeReleaseCore';

const defaultOutputRoot = resolve(process.cwd(), 'dist', 'ota');
const repository = 'Tsukugi/Yuzuha';

const argumentValue = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const uploadRelease = (version: string, bundlePath: string, metadataPath: string, apkPath: string, nativeMetadataPath: string, legacyPointerPath?: string) => {
  const gh = process.platform === 'win32' ? 'gh.exe' : 'gh';
  const nativeMetadata = validateNativeUpdateMetadata(JSON.parse(readFileSync(nativeMetadataPath, 'utf8')));
  assertNativeReleaseArtifacts(nativeMetadata, apkPath, version);
  const assets = [bundlePath, metadataPath, apkPath, nativeMetadataPath];
  if (legacyPointerPath && resolve(legacyPointerPath) !== resolve(metadataPath)) assets.push(legacyPointerPath);
  execFileSync(gh, ['release', 'upload', `v${version}`, ...assets, '--clobber'], {cwd: process.cwd(), stdio: 'inherit'});
};

const printHelp = () => {
  console.log(`
Usage:
  npm run ota-release -- --version <version> [--min-native-version <version>] [--embedded-baseline] [--legacy-global-pointer] [--bundle-url <url>] [--published-at <iso>]
  npm run ota-release -- --version <version> ... --upload --apk <apk> --native-metadata <android-update.json> [--legacy-pointer <bundle.json>]
  npm run ota-check -- <bundle.json>

Builds one Android JavaScript bundle and signed metadata. The OTA private key
must be supplied through YUZUHA_OTA_PRIVATE_KEY_BASE64. Generated files stay
under dist/ota and are not committed. --upload uploads both files to an
existing GitHub release; a new release can be created with gh release create.
`);
};

const runCheck = (metadataPath: string) => {
  const metadata = validateBundleMetadata(JSON.parse(readFileSync(metadataPath, 'utf8')));
  if (!verifyBundleMetadataSignature(metadata)) {
    throw new Error('OTA metadata signature is invalid.');
  }
  console.log(`OTA metadata valid: ${metadata.platform} ${metadata.version}`);
};

if (process.argv[1]?.endsWith('otaRelease.ts')) {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      process.exit(0);
    }
    if (args[0] === '--check') {
      const metadataPath = args[1];
      if (!metadataPath) throw new Error('A metadata path is required for --check.');
      runCheck(resolve(metadataPath));
      process.exit(0);
    }
    const version = argumentValue(args, '--version') ?? argumentValue(args, '-v');
    if (!version) throw new Error('An OTA version is required.');
    const bundleUrl = argumentValue(args, '--bundle-url') ?? `https://github.com/${repository}/releases/download/v${version}/Yuzuha-${version}.jsbundle`;
    const result = buildOtaRelease({
      projectRoot: process.cwd(),
      version,
      bundleUrl,
      outputRoot: defaultOutputRoot,
      publishedAt: argumentValue(args, '--published-at') ?? new Date().toISOString(),
      privateKeyBase64: process.env.YUZUHA_OTA_PRIVATE_KEY_BASE64 ?? '',
      minNativeVersion: argumentValue(args, '--min-native-version'),
      legacyGlobalPointer: args.includes('--legacy-global-pointer'),
      embeddedBaseline: args.includes('--embedded-baseline'),
    });
    if (args.includes('--upload')) {
      const apkPath = argumentValue(args, '--apk');
      const nativeMetadataPath = argumentValue(args, '--native-metadata');
      if (!apkPath || !nativeMetadataPath) throw new Error('--upload requires the same version APK and --native-metadata so every release publishes both delivery forms.');
      const legacyPointerPath = argumentValue(args, '--legacy-pointer');
      if (!args.includes('--legacy-global-pointer') && !legacyPointerPath) {
        throw new Error('--upload requires --legacy-pointer while native 0.1.3 remains supported.');
      }
      uploadRelease(version, result.bundlePath, result.metadataPath, resolve(apkPath), resolve(nativeMetadataPath), legacyPointerPath ? resolve(legacyPointerPath) : undefined);
    }
    console.log(`OTA bundle ready: ${result.bundlePath}`);
    console.log(`OTA metadata ready: ${result.metadataPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'OTA release failed.');
    process.exitCode = 1;
  }
}
