import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildOtaRelease, verifyBundleMetadataSignature} from './otaReleaseCore';
import {validateBundleMetadata} from '../src/installer/metadata';

const defaultOutputRoot = resolve(process.cwd(), 'dist', 'ota');
const repository = 'Tsukugi/Yuzuha';

const argumentValue = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const uploadRelease = (version: string, bundlePath: string, metadataPath: string) => {
  const gh = process.platform === 'win32' ? 'gh.exe' : 'gh';
  execFileSync(gh, ['release', 'upload', `v${version}`, bundlePath, metadataPath, '--clobber'], {cwd: process.cwd(), stdio: 'inherit'});
};

const printHelp = () => {
  console.log(`
Usage:
  npm run ota-release -- --version <version> [--bundle-url <url>] [--published-at <iso>] [--upload]
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
    });
    if (args.includes('--upload')) uploadRelease(version, result.bundlePath, result.metadataPath);
    console.log(`OTA bundle ready: ${result.bundlePath}`);
    console.log(`OTA metadata ready: ${result.metadataPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'OTA release failed.');
    process.exitCode = 1;
  }
}
