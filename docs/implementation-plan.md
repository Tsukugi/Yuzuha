# Implementation plan

Status: Planned work order for the first working Android release.

## Milestone 0: confirm the product contract

Deliver:

- answers to the review questions in `product-plan.md`;
- final minimum Android API and supported device range;
- selected navigation, SQLite, encryption, and test packages;
- decision log entries for each choice.

Exit when the team can describe the MVP without unresolved behavior that changes the data model.

## Milestone 1: make the shell safe

Deliver:

- native Android shell and embedded bundle;
- installer launch gate and typed status;
- metadata fixture, signature/hash verification, atomic cache, and last-known-good behavior;
- `MainApp` startup state and error screen;
- CI for lint, unit tests, bundle check, and Android build.

Exit when clean online, clean offline, upgrade, bad bundle, and first-install failure cases are tested.

## Milestone 2: build the local foundation

Deliver:

- SQLite adapter and migration runner;
- repositories and transaction boundaries;
- UTC/local-date helpers;
- app theme, navigation, form primitives, error handling, and test fixtures;
- export/delete skeleton.

Exit when a test record survives restart and a migration fixture passes.

## Milestone 3: ship personal records

Implement in this order:

1. tasks: create, complete, filters, and overdue logic;
2. notes: edit, archive, pin, tags, and search;
3. money: validation, minor units, totals, filters, and export;
4. Home cards backed by real repository queries.

Exit when the requirements in `requirements.md` are covered by unit and integration tests.

## Milestone 4: add app-time insight

Deliver:

- Android Usage Access explanation and settings link;
- typed native adapter;
- daily aggregation, app exclusion, last-read time, and unavailable states;
- privacy review and device tests for permission changes.

Exit when permission denied is a complete, useful flow and no raw usage data leaves the device.

## Milestone 5: harden for beta

Deliver:

- accessibility pass;
- crash and startup diagnostics with redaction;
- export/delete verification;
- database backup/restore decision;
- performance checks for large note/task/money sets;
- release candidate and rollback rehearsal.

Exit when all release gates in `release.md` pass and there are no open P0/P1 defects.

## Milestone 6: iOS shell and parity

Add the iOS native shell and installer behavior after Android MVP stability. Do not assume Android app-time APIs have an iOS equivalent. Define the iOS data source and user-facing limits before promising parity.

## Work slicing rules

Each issue should fit one reviewable slice:

- one user-visible behavior;
- one data or platform boundary;
- tests for the contract;
- documentation update when behavior or release flow changes.

Do not combine schema changes, installer changes, and large UI rewrites in one slice unless the startup contract requires it.

## Full-product phases

### Phase 2: planning and insight

Deliver accounts/categories, transfers, split transactions, budgets, goals, reports, app groups, time goals, focus sessions, projects, dependencies, and the first recurrence engine.

Exit when money reports reconcile against fixture transactions, time goals show freshness, dependency cycles are rejected, and recurrence rules survive timezone changes.

### Phase 3: capture and automation

Deliver rich notes, attachments, links, templates, saved searches, global search, daily/weekly/monthly reviews, reminders, quiet hours, notification actions, widgets, share capture, shortcuts, deep links, and optional calendar actions.

Exit when every scheduled job is idempotent, every integration has permission/revoke states, search deletion is tested, and accessibility flows cover the new entry points.

### Phase 4: continuity and portability

Deliver account enrollment, encrypted local keys, device enrollment/revocation, encrypted sync, cursors, outbox, tombstones, conflict resolution, encrypted backup, restore, and import tools.

Exit when two devices converge, conflicts are visible, recovery is tested, the service has no plaintext fixture access, and local-only mode remains complete.

### Phase 5: platform and product maturity

Deliver iOS shell and capability matrix, localization, high-confidence accessibility, performance budgets, support packages, diagnostics, incident runbooks, public release process, and store compliance.

Exit when Android and iOS differences are documented in the UI, language/RTL tests pass, support can diagnose failures without content, and staged rollback is rehearsed.

### Phase 6: optional integrations

Evaluate provider connections, OCR, advanced automation, and additional OS integrations one at a time. Each candidate needs a product case, privacy review, legal/region review, support owner, data migration plan, and rollback plan.

Exit only when the candidate has a stable contract and does not weaken local-only behavior.

## Phase gates

Every phase ends with four gates:

1. Product gate: requirements, UX states, limits, and open decisions are resolved.
2. Data gate: schema, migrations, exports, sync encoding, and deletion are updated.
3. Trust gate: permissions, privacy, security, accessibility, and telemetry are reviewed.
4. Operations gate: tests, monitoring, support text, release notes, and rollback are ready.

## Full-product delivery order

Build source-of-truth records before projections, projections before reports, local behavior before sync, and platform adapters before platform-specific UI. Do not build a remote provider before import/export and deletion behavior are stable.
