# Resolved backlog

Completed backlog items are kept here after implementation, tests, and the
required documentation prove the resolved claim. Keep the original `YZ-###`
ID and record the release or implementation note that contains the evidence.

## Resolved items

### YZ-026 — Ship icon resources through the native baseline

The preflight reproduced unsupported Metro font assets. Static icon resolution
has failing-before/passing-after tests; the signed 0.3.0 APK contains the exact
font and four native architectures, while its signed bundle has no Metro assets.
The 65-suite / 326-test run, 34 native tests, signature checks, emulator install
with preserved note, verified GitHub digests and downloaded bytes prove the
published scope. Older feeds remain unchanged. See [0.3.0](releases/v0.3.0.md).

### YZ-025 — Secondary flows on request

Implemented and included in published 0.3.0. Current-value menus replace repeated
choice controls; secondary forms, saved-search naming, recurrence setup,
delivery settings and focus history open on request. Drafts survive collapse,
edit targets reveal their form and validation remains visible. The final
64-suite / 324-test run, typecheck, lint, localTest build and targeted API 35
320×640 dp smoke prove the documented scope. See
[implementation, screen evidence and limits](progressive-disclosure-2026-10-28.md).


### YZ-018–YZ-024 — Android usability and action icons

- YZ-018: Home/Review period choices fit the compact viewport.
- YZ-019: Android Back dismisses menus, returns through Settings and protects primary capture drafts with discard confirmation.
- YZ-020: Data tools errors/status are visible in a fixed region outside all disclosures, including invalid JSON with Export closed.
- YZ-021: periodic capture starts with Repeat enabled; normal capture remains one-off.
- YZ-022: App Time rechecks permission on resume without polling.
- YZ-023: shared action icons retain labels, selected controls show checks, and singular labels are corrected.
- YZ-024: money actions stay above the keyboard, optional date/time no longer precede category, and add controls reserve their own space.

Implemented and included in published 0.3.0. Nine focused regression tests, the
64-suite / 320-test run, typecheck, lint, localTest build and live API 35
320×640 dp verification support these claims. See
[the report](usability-fixes-2026-10-28.md) for per-item evidence and limits;
this is not a claim of complete app or accessibility coverage.


### YZ-017 — Full mobile React Native Paper migration

All primary tabs now use contextual headers with vertical overflow menus and a
cog-labeled Settings action. Persistent workspace configuration is owned by
dedicated Settings routes; source tabs retain only capture and temporary
filters. Fixed option rows are stacked to one full-width column on mobile,
secondary tools use dedicated routes or menus, and empty/default states omit
repeated values and explanatory labels. Evidence includes
`src/app/MainApp.tsx`, the focused layout/navigation tests, the full 63-suite /
311-test run, typecheck, lint, a successful `localTest` build/install, and
visible API 35 320×640 screenshots under
`artifacts/paper-migration-emulator-2026-09-02/` and
`artifacts/mobile-cleanup-emulator-2026-09-02/`.

### YZ-008 — Day, Month, Year, and custom money intervals

Money history now supports All, Day, Week, Month, Year, and Custom; the Money
report supports Day, Week, Month, Year, and Custom. Custom intervals use local
calendar boundaries with an inclusive start and exclusive end, and the same
derived range drives the visible list, totals, chart, report totals, and
split-line filtering. Evidence:
`src/shared/moneyRange.ts`, `src/shared/moneyFilter.ts`, `src/shared/moneyReport.ts`,
focused money range/filter/report tests, and the emulator Money Year/Custom
smoke.

### YZ-009 — Chronological money entries

Visible money entries are sorted by `occurredAt` ascending with a stable ID
tie-breaker. Stored insertion order is unchanged. Evidence:
`src/shared/moneyEntrySort.ts`, `src/shared/moneyEntrySort.test.ts`, and the
filtered-list assertion in `src/shared/moneyFilter.test.ts`. The archived
emulator Money list smoke showed an empty list, so it does not independently
prove rendered ordering. `YZ-013` later superseded the display direction while
keeping the deterministic projection and unchanged stored order.

### YZ-010 — Android OS date and time pickers

Android native date/time dialogs now provide money occurrence values, task due
dates and reminders, recurring-task dates/times, and quiet-hour times. Cancel
keeps the existing value; money occurrences and reminders are converted to UTC
ISO strings only after validation, while date-only and quiet-hour values remain
local strings. Evidence: `DateTimePickerModule.kt`,
`DateTimePickerRulesTest.kt`, the typed bridge, and emulator date/time picker
smoke. iOS picker parity remains planned.

### YZ-011 — On-device App Time metrics

App Time now derives daily average, active-app count, top-app share, busiest
local day, and previous-equivalent-period change from included local Usage
Access snapshots. Excluded apps remain excluded and empty/unavailable states
are explicit. Evidence: `src/shared/usageMetrics.ts`,
`src/shared/usageMetrics.test.ts`, and emulator App Time analysis/refresh
smoke. The populated emulator smoke showed a three-app refresh, a three-minute
daily average, three active apps, an 84% top-app share, and a three-minute
busiest day; the separate earlier run also proves the explicit empty state.
Hourly and category metrics remain unclaimed because the native query does not
provide those boundaries.

### YZ-013 — Recent Money entries first

The visible filtered Money journal now sorts by `occurredAt` descending with a
stable ID tie-breaker. The change leaves stored insertion order and
currency-separated filtered totals unchanged. Evidence:
`src/shared/moneyEntrySort.ts`, `src/shared/moneyEntrySort.test.ts`,
`src/shared/moneyFilter.ts`, `src/shared/moneyFilter.test.ts`, and the full
63-suite/300-test Jest run.

### YZ-014 — Primary tab headers and centralized settings

Overview, Money, Notes, Tasks, and App Time now use one contextual header with
live scope/count data and a vertical three-dot menu. Its cog-labeled Settings
row opens the central Settings screen. Settings owns week-start, App Time
package inclusion/exclusion, and task-reminder preferences; source filters and
record-management actions remain on their tabs. Evidence: `TabHeader` and the
five screen call sites in `src/app/MainApp.tsx`, the focused header/Settings
renderer tests, and the full 63-suite/303-test Jest run. Typecheck, lint, and
diff checks also pass. No schema, migration, network request, worker, timer, or
polling loop was added.

### YZ-015 — Singular Money account count

The visible emulator smoke found `EUR · 1 active accounts` in the new Money
header. A deterministic formatter test now covers one and multiple accounts,
and the rebuilt `localTest` APK shows `EUR · 1 active account`. Evidence:
`formatActiveAccountCount` in `src/app/MainApp.tsx`, its focused renderer test,
and `artifacts/header-settings-emulator-2026-09-02/05-money-fixed.xml`.

### YZ-016 — Mobile Settings drill-down navigation

Settings no longer expands top-level category controls inline. React Native
Paper provides the compact five-row category list, app bars, surfaces, and
Material icons; each row opens one dedicated detail screen, and Back returns
to the Settings root. Paper's MD3 theme maps to Yuzuha's active light/dark
palette. Evidence: `SettingsScreen`, `SettingsNavigation`, and the Paper theme
adapter; the focused Settings tests; the full 63-suite/303-test run; typecheck,
lint, the successful `localTest` build/install, and API 35 dark-mode screenshots
`19-paper-settings-root-light.png`, `20-paper-appearance-dark.png`, and
`21-paper-settings-root-dark.png` under
`artifacts/header-settings-emulator-2026-09-02/`.
