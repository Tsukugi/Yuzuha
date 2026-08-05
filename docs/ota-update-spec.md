# Yuzuha OTA update specification and implementation plan

Status: Android implementation present. Local tests, lint, typecheck, Android
builds, signed release build, GitHub Release publication, live activation,
pending promotion, and rollback device smoke pass. This document is the
contract, implementation plan, and auto-grill record for the pass. Evidence is
recorded in `docs/releases/v0.1.3.md`.

The goal is to let an installed Yuzuha app receive a new React Native
JavaScript bundle without installing a new APK. The Android native shell stays
in charge of selecting and verifying executable code.

## 1. Current state

Yuzuha now has an Android startup bundle gate and manual OTA path:

- `MainApplication` starts `YuzuhaBundleInstaller` before creating the React
  host.
- The installer checks one bounded HTTPS metadata response.
- Metadata is checked against the app ID, Android platform, React Native
  runtime, version, minimum native version, size, hash, timestamp, and pinned
  Ed25519 signature.
- A newer bundle is downloaded to app-private storage and checked for the
  exact size and SHA-256 hash before it is stored as pending.
- The app uses the newest verified private bundle or the embedded bundle when
  the remote check is unavailable or invalid.
- Data tools has a visible manual `Code updates` action. It checks and prepares
  a verified bundle while the current process keeps running.
- State schema 2 stores current, pending, attempted, and blocked-version data.
  A pending bundle is selected only on a later launch and is promoted after
  the React root reports health.
- `npm run ota-release` builds the Android bundle and signs the exact metadata;
  `npm run ota-check` validates and verifies a metadata file.
- GitHub Releases carry the signed `bundle.json` and immutable bundle assets;
  the latest-release asset URL is the native metadata source.
- iOS does not have an OTA bundle loader yet.

Rapunzel is the reference for the missing product flow. Its useful parts are a
visible update control, a verified download that applies on the next launch,
versioned private storage, and a pending/current record used for rollback.
Rapunzel's ZIP archive format is not copied for the first Yuzuha pass because
Yuzuha's current native contract verifies one bundle file directly and does not
yet define OTA asset archives.

## 2. Goals

This pass must:

1. Add a user-triggered Android OTA check.
2. Download only a newer bundle compatible with the installed native shell.
3. Keep all executable-code verification in native code.
4. Prepare an update while the current bundle is running.
5. Apply the prepared update only on the next launch.
6. Keep the previous known-good bundle available for rollback.
7. Prevent a bundle that fails its first startup from being retried forever.
8. Preserve all local product data during update, failure, and rollback.
9. Provide release tooling that produces the exact bundle metadata required by
   the native verifier.
10. Keep the process bounded: one startup check, one manual check at a time,
    fixed network limits, and no polling worker.

## 3. Non-goals

The first pass will not:

- install a new APK or change native code;
- add native modules, permissions, resources, or configuration through OTA;
- download TypeScript source and compile it on the device;
- hot-swap the running React Native bridge;
- add a periodic background update worker;
- send account IDs, device IDs, workspace records, notes, money, tasks, or
  app-time data to the update service;
- change the app, SQLite, backup, or CSV schemas;
- add an iOS OTA loader in the Android-first pass;
- add automatic release publishing without an explicit release command;
- make an unsigned or hash-only bundle acceptable.

## 4. Fixed decisions

### Platform scope

Phase one is Android-only. This matches the existing verified native gate and
the current release verification environment. The metadata keeps a platform
field so an aligned iOS implementation can be added later without changing
the Android meaning.

### Update source

The source is the latest GitHub Release metadata asset:

```text
https://github.com/Tsukugi/Yuzuha/releases/latest/download/bundle.json
```

GitHub redirects this stable URL to the latest release's immutable
`bundle.json` asset. The native verifier follows that redirect, then checks
the signed metadata. The response contains one Android release for the current
Yuzuha runtime. The bundle URL must be an immutable HTTPS GitHub Release URL.
The release publisher uploads the immutable bundle and metadata assets before
the release is made latest.

### Startup behavior

The current one-check startup behavior remains. Startup may prepare a newer
release before the React host is created. A visible in-app action adds an
explicit manual check while the current bundle is running. Neither path starts
a polling loop.

### Activation behavior

Downloaded code is never hot-swapped. A manual download writes a pending
record. The next process launch tries that pending bundle. JavaScript marks the
launch healthy only after the root app has rendered. If the process dies before
that signal, the next launch removes the pending bundle and returns to the
previous current bundle or the embedded bundle.

### Native compatibility

The first OTA contract is tied to:

- app ID: `yuzuha-mobile`;
- platform: `android`;
- React Native runtime: `0.86.0`;
- native version: `0.1.3` for the current release;
- Android minimum API: 33;
- maximum bundle size: 64 MiB.

Any native release that changes the runtime, bundle format, verifier, or
required native APIs must publish a new native compatibility value and update
the release notes before it can accept OTA code.

## 5. User experience

### Entry point

Add a collapsed `Code updates` disclosure to `Data tools`. The existing data
tool sections start closed, so the OTA control follows the same progressive
disclosure rule and does not compete with money, notes, or tasks.

The disclosure shows:

- the currently running JavaScript bundle version;
- whether an update is being checked, prepared, ready, current, or failed;
- the available version when one is found;
- a `Check for code update` action;
- a `Download update` action after a newer release is found;
- a clear message that the update applies after closing and reopening Yuzuha.

The screen must not claim that an update was installed. The correct wording is
`Update ready. Close and reopen Yuzuha to apply it.`

### States

The typed UI state is:

```text
idle
checking
available
preparing
prepared
current
error
```

Rules:

- `checking` disables the control until the native check completes.
- `available` shows the candidate version and enables download.
- `preparing` disables the control and shows progress when native progress is
  available.
- `prepared` disables a second download for the same candidate and explains
  the next-launch rule.
- `current` says that no newer compatible code was found.
- `error` shows a short deterministic error and allows the same check to be
  run again by the user.
- A failed check must not clear a previously prepared update.

### No product-data impact

The control does not write `AppData`, SQLite, preferences, backups, or sync
records. Closing and reopening the app is the only user action needed to apply
the pending bundle.

## 6. Signed metadata contract

The first pass keeps schema `1` and the existing signed payload. A future
metadata schema may add release notes or archive assets, but it must not be
accepted by the current native verifier without an explicit schema change.

Example:

```json
{
  "schema": 1,
  "appId": "yuzuha-mobile",
  "platform": "android",
  "runtime": "0.86.0",
  "version": "0.2.0",
  "minNativeVersion": "0.1.3",
  "bundleUrl": "https://github.com/Tsukugi/Yuzuha/releases/download/v0.2.0/Yuzuha-0.2.0.jsbundle",
  "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "sizeBytes": 1234567,
  "publishedAt": "2026-08-05T12:00:00Z",
  "signature": "base64-ed25519-signature"
}
```

Required validation:

- `schema` is exactly `1`;
- `appId` is exactly `yuzuha-mobile`;
- `platform` is exactly `android` for this pass;
- `runtime` is exactly `0.86.0`;
- `version` is strict semantic version syntax;
- `minNativeVersion` is strict semantic version syntax and is not newer than
  the installed native version;
- `bundleUrl` is HTTPS, has no username, password, query, or fragment, and
  uses an immutable versioned path;
- `sha256` is a lowercase 64-character hexadecimal digest;
- `sizeBytes` is a positive integer no larger than 64 MiB;
- `publishedAt` is a valid ISO-8601 timestamp;
- `signature` is a valid base64 Ed25519 signature;
- the candidate version is newer than the effective installed version;
- the canonical signature verifies with the public key pinned in the native
  shell.

The canonical payload remains the newline-joined values in this order:

```text
schema
appId
platform
runtime
version
minNativeVersion
bundleUrl
sha256
sizeBytes
publishedAt
```

No JSON key order, whitespace, or optional field may affect the signature.

## 7. Native state and file layout

All OTA files stay below:

```text
<filesDir>/installer/
  state.json
  verified/
    bundle-<version>.jsbundle
    .bundle-<version>.tmp
  .state.tmp
```

The native code must resolve and validate every path. No path from metadata or
JavaScript may escape `filesDir/installer/verified`.

### State schema

The new state record is version `2`:

```json
{
  "schema": 2,
  "current": {
    "version": "0.1.3",
    "fileName": "bundle-0.1.3.jsbundle",
    "sizeBytes": 1234567,
    "sha256": "...",
    "runtime": "0.86.0",
    "minNativeVersion": "0.1.3"
  },
  "pending": {
    "version": "0.2.0",
    "fileName": "bundle-0.2.0.jsbundle",
    "sizeBytes": 1234567,
    "sha256": "...",
    "runtime": "0.86.0",
    "minNativeVersion": "0.1.3",
    "attempted": false
  },
  "blockedVersion": null
}
```

Rules:

- `current` is the last known-good verified bundle.
- `pending` is a verified bundle waiting for its next launch attempt.
- A valid `pending` version must be newer than the effective embedded/current
  version; an older or equal pending record is rolled back to that baseline.
- `attempted` is set atomically before the pending bundle is selected.
- `blockedVersion` records a pending version that failed to reach the health
  signal. The startup check must not immediately download that same version
  again.
- A state record is valid only when all referenced files exist, are children
  of the verified directory, have the expected name, size, and SHA-256, and
  carry the current runtime and a `minNativeVersion` no newer than the
  installed native version.
- State writes use a temporary file, `fsync`, and atomic replacement.
- A failed download removes its temporary file and leaves `current` and any
  existing `pending` record unchanged.
- A failed state write must not replace the previous valid state.
- A malformed or unsupported state file is not guessed or silently rewritten.
  Startup uses the embedded bundle with `INVALID_STATE`; manual update calls
  return the same deterministic error.

### Existing installations

The current release writes a flat state record with `version`, `fileName`,
`sizeBytes`, and `sha256`. The new loader will read that shape as a legacy
current record and write the new state shape after the next successful state
change. This is installer-state compatibility only; it is not an app-data
migration and does not accept an old bundle format or an unsafe path.

## 8. State transitions

### Clean launch

1. Read and validate `state.json`.
2. If there is no valid current record, use the embedded bundle.
3. If there is a valid pending record with `attempted: false`, set
   `attempted: true` atomically and select it.
4. If there is a pending record with `attempted: true`, remove it, set
   `blockedVersion` to that version, and select `current` or embedded code.
5. Perform the one bounded metadata check.
6. If a newer candidate is valid and is not blocked, verify and prepare it.
7. Start the React host only with the selected embedded, current, or pending
   file.

### Healthy launch

After the React root has rendered, JavaScript calls
`markLaunchSuccessful()` through the native bridge. Native code then:

1. copies `pending` to `current`;
2. clears `pending` and `blockedVersion`;
3. atomically writes the new state;
4. keeps the old bundle file until the state write succeeds.

If there is no pending record, the call is a no-op.

### Manual check

1. The UI calls `checkForUpdate()` through the native bridge.
2. Native code serializes this check with any other installer operation.
3. Native code fetches and validates the signed metadata.
4. If a valid pending version is equal to or newer than the candidate, return
   `prepared` for that pending version and do not replace it with older code.
5. If the candidate is not newer than the effective current version, return
   `current`.
6. If the candidate is newer, return `available` without changing state.
7. The UI asks the user to download the available candidate.
8. Native code downloads to a versioned temporary file, checks exact size and
   SHA-256, atomically moves the file, and writes `pending`.
9. Return `prepared`. The current process continues to run its current bundle.

If a matching pending record already exists and its file is still valid, the
download action returns `prepared` without downloading it again.

### Bad-bundle rollback

The health signal is intentionally after root rendering. A process crash,
native startup failure, or JavaScript failure before that signal leaves
`pending.attempted` set. The next launch treats that version as bad, clears the
pending record, stores `blockedVersion`, and starts the last known-good bundle
or embedded bundle. A later release with a different version may still be
accepted.

## 9. Native bridge contract

The JavaScript side must use a typed bridge. It must not fetch metadata or
download executable code itself.

Native methods:

```ts
type NativeLaunchStatus = {
  kind: 'embedded' | 'local-current' | 'remote-activated' | 'offline-local' | 'invalid-remote';
  version: string;
  reasonCode?: string;
};

type NativeUpdateCheck =
  | {kind: 'current'; currentVersion: string}
  | {kind: 'available'; currentVersion: string; availableVersion: string}
  | {kind: 'prepared'; currentVersion: string; availableVersion: string}
  | {kind: 'error'; currentVersion: string; reasonCode: string};

interface NativeInstallerBridge {
  getLaunchStatus(): Promise<NativeLaunchStatus>;
  checkForUpdate(): Promise<NativeUpdateCheck>;
  downloadUpdate(): Promise<NativeUpdateCheck>;
  markLaunchSuccessful(): Promise<void>;
}
```

The exact bridge method names may be adjusted during implementation, but the
following rules are fixed:

- all network and file verification runs in native code;
- calls are serialized;
- the native side returns named results, not free-form success text;
- the bridge validates the returned shape before the UI uses it;
- an `available` or `prepared` version must be strictly newer than the
  reported current version;
- missing bridge support in a debug or non-Android environment uses the
  embedded version and reports OTA as unavailable;
- bridge errors do not erase a prepared update.

The startup `App` flow calls `markLaunchSuccessful()` after the verified launch
status is read and the root app has rendered. It must not mark success from a
native startup callback before React has rendered.

## 10. Release tooling

Add `scripts/otaRelease.ts` and an npm script:

```text
npm run ota-release -- --version 0.2.0 --bundle-url <immutable-url>
```

The command must:

1. validate the requested version and require it to be newer than the embedded
   version;
2. build the Android release bundle with the repository's React Native 0.86
   Metro configuration;
3. write the bundle to an ignored staging directory;
4. calculate exact byte size and lowercase SHA-256;
5. create the canonical metadata payload;
6. sign the payload with the OTA Ed25519 private key;
7. verify that the private key derives the pinned public key;
8. write `bundle.json` and a release record containing version, URL, size,
   hash, and timestamp;
9. run metadata and artifact checks before reporting success;
10. optionally upload the immutable bundle and then publish the metadata
    pointer through an explicit `--upload` action.

Signing requirements:

- private key input is an ignored CI/local environment variable such as
  `YUZUHA_OTA_PRIVATE_KEY_BASE64` containing a PKCS#8 Ed25519 private key;
- the private key is never read from a committed file;
- the command fails if the key does not derive the pinned public key;
- key generation or rotation is an explicit release operation outside the
  repository; the release command never rotates the key implicitly;
- generated bundles, metadata, and staging files are ignored by Git.

The first release format is one Android `.jsbundle` per version. If Yuzuha
later needs bundled images or other Metro assets, define a new signed archive
schema first. Do not silently add asset files to the current single-file
contract.

## 11. Testing plan

### TypeScript unit tests

Add or extend focused tests for:

- strict metadata validation;
- HTTPS-only and no-query/no-fragment URL rules;
- version comparison and no downgrade;
- native compatibility rejection;
- canonical signing payload stability;
- typed bridge success, current, available, prepared, error, and invalid
  result handling;
- UI state transitions for check, download, current, prepared, and failure;
- a failed check preserving an existing prepared update.

### Native tests

Extract small pure validation/state helpers where needed and test:

- valid and invalid metadata fields;
- invalid signatures;
- exact size and SHA-256 mismatch;
- oversized metadata and bundle responses;
- rejected non-HTTPS URLs and failed GitHub Release redirects;
- path traversal and invalid state file names;
- legacy flat state loading;
- atomic pending creation;
- pending attempt marking;
- successful promotion to current;
- failed pending launch rollback and blocked-version recording;
- repeated startup not retrying the same blocked version;
- temporary files removed after every failed download.

Use a local bounded HTTP fixture for metadata and bundle responses. Do not
depend on the live update endpoint for unit tests.

### Release-tool tests

Test that the release command:

- rejects invalid or non-increasing versions;
- rejects a missing bundle;
- emits the exact hash and byte count;
- emits a metadata payload accepted by the validator;
- produces a signature accepted by the pinned public key;
- fails for a mismatched signing key;
- does not include private key material in output;
- keeps generated output outside the committed tree.

### Android smoke tests

Run these checks with a signed APK and a local test endpoint or controlled
fixture:

1. Clean install starts from the embedded bundle when the endpoint is offline.
2. An older or equal signed release leaves the current version unchanged.
3. A newer valid release is selected at startup and is marked healthy after
   the root app renders.
4. A manual check finds a newer release while the current app remains usable.
5. A manual download reports ready and does not hot-swap the current process.
6. Reopening the app starts the prepared bundle.
7. A bundle that fails before the health signal rolls back on the following
   launch.
8. The failed version is not downloaded again on every launch.
9. Tampered metadata, signature, size, hash, URL, or compatibility leaves the
   previous state unchanged.
10. Money, notes, tasks, app-time history, and attachments remain unchanged
    after update and rollback.
11. Logcat contains no unhandled installer or React startup error for the
    valid, offline, and rollback paths.

## 12. Documentation changes required with implementation

When code changes begin, update these files in the same change:

- `docs/installer.md`: metadata, state schema, manual check, pending launch,
  rollback, and release source;
- `docs/architecture.md`: native ownership, startup order, bridge boundary,
  and no-hot-swap rule;
- `docs/testing.md`: focused test results and Android OTA smoke evidence;
- `docs/release.md`: OTA build/sign/publish steps, key handling, rollback, and
  release checklist;
- `docs/security-and-privacy.md`: signed-code trust boundary, no user data in
  update requests, and private storage limits;
- `docs/decision-log.md`: Android-first scope, key ownership, state schema,
  pending activation, and the reason the Rapunzel archive format is not copied;
- `README.md`: only after implementation and tests prove the feature. It must
  describe the update as shipped only after that evidence exists.

The release notes for the first shipped OTA pass must include the native
compatibility value, bundle version, bundle hash, signing-key rotation status,
rollback status, and the fact that native changes still require a new APK.

## 13. Implementation phases

### Phase 0: spec and fixture

- Keep this document as the approved contract.
- Add deterministic signed metadata and bundle fixtures under test-only paths.
- Define the pinned public-key fixture and test private key separately from
  production secrets.
- Confirm the update endpoint ownership and the CI secret name.

Exit check: fixtures validate, and no production key is present in the tree.

### Phase 1: native state and verification

- Refactor `BundleInstaller.kt` into clear metadata, file, state, and launch
  operations.
- Add state schema 2 with current, pending, and blocked version fields.
- Preserve the current startup gate and exact verification rules.
- Add `checkForUpdate`, `downloadUpdate`, and `markLaunchSuccessful` native
  operations.
- Serialize startup and manual operations.
- Add rollback and blocked-version behavior.

Exit check: native tests and `:app:compileDebugKotlin` pass; invalid input never
changes active state.

### Phase 2: typed JavaScript bridge and UI

- Extend `src/installer/BundleInstaller.ts` with typed update results.
- Keep JavaScript out of the download and verification path.
- Add a `Code updates` disclosure to `DataToolsScreen`.
- Add the deterministic UI states and user messages.
- Call the health signal after the root app has rendered.

Exit check: focused bridge/UI tests pass, and the current data tools behavior
still starts closed.

### Phase 3: release command

- Add `scripts/otaRelease.ts` and npm scripts.
- Build the Android bundle with the current RN/Metro baseline.
- Sign canonical metadata with the private key supplied through the environment.
- Verify the derived public key, hash, and byte count.
- Add ignored staging output and a dry-run validation path.

Exit check: a test key creates metadata accepted by the validator; production
secrets are not written.

### Phase 4: documentation and device verification

- Update all documents listed in section 12.
- Run the full test, typecheck, lint, bundle, Kotlin, and signed Android build
  checks.
- Run the valid update, offline, tamper, pending, and rollback smoke paths.
- Record exact results and do not describe untested endpoint activation as
  proven.

Exit check: the acceptance criteria below are all evidenced.

## 14. Acceptance criteria

The OTA pass is complete only when all of these are true:

- a valid newer Android bundle can be found and prepared from the running app;
- the native shell verifies metadata signature, compatibility, size, and hash;
- the running bundle is not replaced in place;
- the next launch uses the pending bundle;
- a failed first launch returns to the previous known-good or embedded bundle;
- the same failed version is not retried forever;
- no update failure changes product data;
- release tooling creates reproducible metadata and never commits secrets;
- focused tests cover the verification and state transitions;
- full static checks and Android build checks pass;
- the manual device smoke is recorded in `docs/testing.md`;
- documentation and release notes do not claim iOS OTA or unverified live
  endpoint behavior.

## 15. Open follow-up: iOS

The later iOS pass should reuse the signed metadata contract and release
tooling, but it needs its own native loader in `AppDelegate.swift`, app-private
file handling, pending/current state, and Xcode verification. It must be
planned and tested separately rather than claiming cross-platform OTA from the
Android implementation.

## 16. Auto-grill review

This section challenges the plan before implementation starts. Each question
has a decision so the implementation does not drift into vague recovery logic.

### Does Yuzuha need both startup checking and a manual update button?

Yes, but they have different jobs. The existing startup gate is part of the
Yuzuha security contract and remains one bounded check before React starts.
The manual control gives the user a visible retry and a way to prepare code
while the current app is open. Neither path polls in the background.

The UI must show a prepared update if startup already downloaded one. It must
not make the user download the same version again.

### Why not copy Rapunzel's ZIP archive format exactly?

Because the current Yuzuha native verifier accepts one signed bundle URL and
one hash. Copying a ZIP format would add extraction, asset path validation,
expanded-size limits, and a new signed contract before Yuzuha needs them.

The release tool must fail if the bundle build produces required Metro assets
outside the single bundle contract. It must not publish an update that silently
loses assets. An archive format can be added later as a new metadata schema.

### Can a JavaScript-only implementation be trusted?

No. JavaScript must not fetch, hash, verify, or select executable code. The
native shell owns the network request, signature verification, file move, state
write, and launch selection. JavaScript receives typed results and renders
status only.

### What happens if the downloaded bundle is valid but crashes on startup?

The pending record is marked `attempted` before selection. JavaScript promotes
it only after the root app renders and calls the health signal. If the process
dies first, the next native launch clears pending, stores `blockedVersion`,
and uses the previous current or embedded bundle.

This is a bounded startup health check, not a claim that every later runtime
bug can be detected. A later crash-monitoring policy is outside this pass.

### Could the same bad release be downloaded again forever?

Not after a failed pending launch. `blockedVersion` prevents automatic and
manual preparation of that exact version until a newer version is published.
The blocked marker is cleared only after a different pending version starts
successfully. A publisher rollback must therefore use a new higher version,
not republish the same broken version.

### Can a failed download destroy the current bundle?

No. The download uses a versioned temporary file. Size and hash are checked
before the move. State is written to a separate temporary file and atomically
replaced only after the bundle move succeeds. Every failure path removes its
temporary file and leaves the previous state unchanged.

### Can two checks race and overwrite each other?

No. Startup and manual installer operations use one native lock/queue. The UI
also disables its action while a request is active. The native lock is the
source of truth because UI state can be lost or duplicated.

### Does the update service learn anything about the user?

No. The request contains only the public metadata request. It must not include
an account, device identifier, workspace identifier, local records, or usage
data. The endpoint may see ordinary transport information such as an IP
address, but Yuzuha sends no product identity in the request.

### Who owns the signing key and the endpoint?

The production Ed25519 private key belongs to the release system owner and is
available only as a CI secret or an ignored local environment value. The
public key is pinned in the app. The release command must derive and compare
the public key before it signs anything.

The endpoint is a public, unauthenticated metadata source. The publisher must
upload the immutable bundle and `bundle.json` to the same GitHub Release before
making that release latest. If GitHub release ownership or key custody is not
confirmed, implementation stops at local fixtures and does not claim live OTA
readiness.

### Can OTA change the data schema?

No. OTA code must run with the installed native compatibility and current app
schema. A feature needing a new native module, permission, database schema,
backup format, or migration requires a new APK and the normal release process.

### Is the startup health signal strong enough?

It is strong enough for the stated boundary: the root component has rendered
and the bundle can start the product shell. It does not prove every screen or
future interaction works. The smoke test must include opening the primary
screens after a successful OTA launch, and the release process must keep the
previous bundle available for a manual rollback decision.

### What if the app is killed after download but before the next launch?

The pending record is durable and the current process continues using its
current bundle. The next process launch finds the pending record and applies
the normal attempted/health-signal rule. No background worker is needed.

### What if the user repeatedly presses the update action?

The UI disables the action while busy. Native serialization handles duplicate
calls that still arrive. A valid pending file for the same version is reused;
it is not downloaded again.

### Does Android-only conflict with the dual-platform product direction?

No, if the scope is explicit. Yuzuha is Android-first and the current verified
installer is Android-only. This pass ships Android OTA only and keeps iOS as a
separate implementation with its own native loader and build verification.
No README or release note may claim iOS OTA after this pass.

### What would block implementation?

Implementation must stop and report the blocker if any of these remain
unresolved:

- the active production signing key cannot be verified against the pinned
  public key;
- the GitHub Release cannot publish both assets before it becomes latest;
- the native test cannot prove invalid input leaves the active state unchanged;
- the release bundle requires assets that the single-file contract cannot carry;
- the Android build cannot load the pending path before React host creation;
- a rollback test cannot distinguish a failed pending version from a valid
  current version.

These are hard gates. Do not add fallback downloads, unsigned paths, silent
retries, or guessed compatibility behavior to work around them.
