# Yuzuha agent instructions

Use simple wording. Do not claim that a feature exists until the implementation and tests prove it.

## Project rules

1. Yuzuha is an Android-first React Native app with a dual-platform native shell. The product tracks money, app time, notes, and tasks.
2. The native shell includes an embedded installer. At startup it must check the bundle version, download a newer verified release when one is available, and only then present `MainApp`.
3. The implementation baseline is React Native 0.86.0, React 19.2.8, TypeScript 5.9.x, Metro 0.86.x, and the bundled React Native CLI 20.2.x. This supersedes the older January 2026 planning baseline. Record any version change in the release notes and decision log.
4. Keep `README.md`, this file, and the whole `docs/` tree current when features, configuration, or release behavior changes.
5. Any change to startup, bundle caching, or installer metadata must update `docs/installer.md` and the relevant developer note in `docs/architecture.md`, `docs/testing.md`, or `docs/release.md`.

## Work style

- Reproduce a bug with a test before fixing it.
- For improvements, inspect the implementation first and explain the current behavior before changing it.
- Do not use blind fixes, recovery fixes, or vague best-effort behavior. Define a deterministic rule and test it.
- When planning, challenge the assumptions using the review questions in `docs/product-plan.md`.
- Prefer small, typed modules with clear ownership.

## Current repository status

The recurring-task pass is implemented: date-based rules can be created, paused/resumed, and deleted. Startup expands due rules once using explicit all/one/skip missed-occurrence policies. Custom lists can be created, renamed, archived/restored, and deleted only when unused by tasks or recurring rules. Inbox cannot be archived or deleted.

The current implementation also supports encrypted backup file save/open, local recovery-key backups, local note attachment storage, note tags and case-insensitive search over title/body/tag/attachment names, note edit/pin/archive/restore/delete controls, local saved searches, local global search across supported workspace records, note-to-task conversion with stable source links, task create/edit/delete controls, task priorities, task lists, due-date filters, Android attachment opening through a validated FileProvider bridge, and attachment bytes in new encrypted backups through the system document picker. Plain JSON exports carry attachment metadata only. iOS attachment preview, account recovery, device enrollment, and sync remain planned.

The recurring-task pass adds schema 16 task rules, deterministic local-date expansion, and reference-safe task-list deletion. Notifications, account recovery, device enrollment, sync, and later full-product phases remain planned.

The current core is implemented through the recurring-task pass: the repository has a `src/` app, generated Android/iOS projects, a transactional SQLite repository with legacy AsyncStorage import, normalized money/transfer/split/budget tables, generic persisted recurrence rules, an embedded bundle gate, Home/Money/Notes/Tasks flows, Android app-time reads, package exclusions, time goals, money editing/deletion, archive controls, currency-separated money reports, account balances, validated same-currency transfers, exact-sum split entries, source-backed budgets, one-period carry-forward projections, versioned JSON/CSV exports, password-encrypted XChaCha20-Poly1305 backups with scrypt key derivation, local recovery-key backup envelopes, strict JSON restore validation with preview and confirmed replacement, confirmed local deletion, deterministic local-calendar money and task recurrence expansion, explicit all/one/skip missed-occurrence policies, schema 16 task recurrence rules, schema 15 task fields and task-list migration from schema 14, schema 14 task source-note links, schema 13 saved-search records, case-insensitive search over title/body/tag/attachment names, local global search across supported workspace records with archive and Usage Access rules, local note attachments with checksums and size/type limits, new encrypted backup payloads that carry verified attachment bytes, local saved-search Apply/Delete controls, and an Android FileProvider bridge that opens supported private files in an external viewer. Plain JSON exports remain metadata-only. Notifications, iOS attachment preview, account recovery, device enrollment, sync, and later full-product phases remain planned. Check implementation evidence before describing planned work as shipped.
