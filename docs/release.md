# Release process

Status: Planned release process.

## Release types

### JavaScript bundle release

Use for UI and business-logic changes that do not require native changes.

1. Run lint, unit, integration, and bundle checks.
2. Build Android and iOS bundles from the pinned toolchain.
3. Record the app version, runtime, native minimum, file size, SHA-256, and signature.
4. Upload immutable bundle files.
5. Publish matching metadata only after the file is available.
6. Run an online update, offline launch, and invalid-bundle test.
7. Monitor activation and startup failures.

### Native release

Use when changing permissions, native APIs, the embedded bundle, cache behavior, database encryption, or the minimum OS version.

1. Update native version and migration notes.
2. Test upgrade from the previous production build.
3. Verify the embedded bundle starts without network access.
4. Verify the installer can move from embedded to remote and back to last-known-good.
5. Build signed artifacts in CI.
6. Complete privacy, security, accessibility, and store metadata review.
7. Publish staged rollout and keep rollback artifacts available.

## Pre-release checklist

- [ ] Product requirements for the release are accepted.
- [ ] `README.md`, `AGENTS.md`, and affected `docs/` files are updated.
- [ ] `npm run lint` passes.
- [ ] Jest and integration tests pass.
- [ ] `npm run check-bundle` passes against release metadata.
- [ ] Android debug and release builds pass.
- [ ] Clean install, upgrade, offline, and process-death tests pass.
- [ ] Installer signature, hash, size, compatibility, and rollback tests pass.
- [ ] Database migration and export/delete tests pass.
- [ ] No P0/P1 defects are open.
- [ ] Permissions and privacy text match the shipped behavior.
- [ ] Release notes name known limits and data changes.

## Rollback

For a bad JavaScript bundle, stop publishing its metadata, mark it bad in the release system, and point new launches to the last-known-good version. Existing clients follow the installer rollback rule in `installer.md`. Do not delete the previous verified bundle until the incident is closed.

For a native release, stop the staged rollout and publish the previous native artifact if the store allows it. If native rollback is not possible, release a patch with the smallest safe change and keep the embedded bundle usable.

## Release notes must include

- user-visible changes;
- data schema or migration changes;
- permission changes;
- minimum native version;
- JavaScript bundle version and hash;
- known limits and rollback status.

## Developer note: startup changes

Any release that changes the bundle gate, cache, metadata schema, activation, or startup order must include installer test evidence. A normal UI release may still be blocked if it fails to start from the verified bundle.

## Full-product release tracks

### Data release

Use when adding or changing schema, migrations, exports, sync encoding, conflict records, or deletion. The release record includes old/new schema versions, migration fixtures, export compatibility, rollback limits, and a restore test.

### Sync release

Use when changing encryption, key wrapping, device enrollment, API cursors, conflict rules, tombstones, or account deletion. Require a security review, two-device test, offline test, recovery test, service rollout plan, and a client rollback plan.

### Integration release

Use when adding permissions, widgets, share actions, calendar, shortcuts, providers, or background execution. Require a capability matrix, permission/revoke test, store disclosure review, locked-screen privacy test, and platform-specific release notes.

### Localization/accessibility release

Use when adding languages, layout systems, charts, gestures, or large feature areas. Require translation completeness, pseudo-localization, RTL, screen reader, large text, contrast, reduced motion, and locale/date/currency tests.

## Public rollout stages

1. Internal build: trusted devices, debug diagnostics, test data only.
2. Closed beta: staged native or bundle rollout with explicit feedback and rollback owner.
3. Open beta: monitor startup, migration, sync, export, and crash metrics; keep known limits public.
4. General release: publish support, privacy, data portability, and incident contacts.
5. Maintenance: patch supported native versions, bundle versions, schema versions, and security dependencies according to the support policy.

Full-product phases may ship independently, but a later phase cannot silently change the meaning of existing money totals, task recurrence, reminders, or exported data.
