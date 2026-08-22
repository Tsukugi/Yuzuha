# Resolved backlog

Completed backlog items are kept here after implementation, tests, and the
required documentation prove the resolved claim. Keep the original `YZ-###`
ID and record the release or implementation note that contains the evidence.

## Resolved items

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
prove rendered ordering.

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
