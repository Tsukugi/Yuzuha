# Requirements traceability

Status: Traceability baseline through the Android money-search-focus pass.

## Authoritative source by concern

| Concern | Authoritative document | Evidence required |
| --- | --- | --- |
| Product scope and phases | `product-plan.md` | Accepted phase decision and product review. |
| Detailed user behavior | `full-product-spec.md` | Feature acceptance tests and UX review. |
| Requirement IDs | `requirements.md` | Automated or documented acceptance evidence. |
| Runtime and module boundaries | `architecture.md` | Code ownership, integration tests, and diagrams. |
| Local/sync schema | `data-model.md` | Migration, fixture, export, and conflict tests. |
| Sync API | `sync-and-backup.md`, `api-contract.md` | Two-device, retry, recovery, and security tests. |
| Notifications | `notifications-and-automation.md` | Scheduler and device behavior tests. |
| Integrations | `integrations.md` | Permission, revoke, offline, and platform tests. |
| Accessibility/localization | `accessibility-and-localization.md` | Screen-reader, large-text, RTL, and locale tests. |
| Privacy/security | `security-and-privacy.md` | Threat review, redaction tests, and release approval. |
| Bundle startup | `installer.md` | Installer matrix and release evidence. |
| Quality and operations | `testing.md`, `analytics-and-operations.md` | CI, device, service, incident, and rollback evidence. |

## Phase evidence matrix

| Phase | Product evidence | Engineering evidence | Release evidence |
| --- | --- | --- | --- |
| 0 Foundation | Scope and open decisions accepted. | Shell, database, migrations, typed errors, and installer tests. | Clean install, offline launch, and bad-bundle result. |
| 1 Core records | Money, notes, tasks, Home, app-time empty states. | Repository, query, export, delete, and device tests. | MVP release checklist and migration fixture. |
| 2 Planning and insight | Budgets, goals, reports, projects, recurrence, focus. | Reconciliation, timezone, dependency, and projection tests. | Data release notes and performance baseline. |
| 3 Capture and automation | Rich notes, links, reviews, reminders, integrations, and one-way dated-task calendar drafts. | Scheduler, search, attachment, calendar-boundary, permission, and accessibility tests. | Integration disclosures and notification rollback. |
| 4 Continuity | Sync, recovery, conflicts, backup, import. | Two-device, encryption, API, deletion, outage, current CSV import, current JSON file restore, and encrypted-backup file-bound tests. | Security review, service rollout, and recovery rehearsal. |
| 5 Maturity | iOS capability matrix, localization, support. | Performance, SLO, redaction, store, and incident tests. | Staged rollout and public support policy. |
| 6 Optional integrations | Provider/OCR/advanced automation decision. | Provider isolation and new threat model. | Separate legal, privacy, and rollback approval. |

## Requirement evidence rule

An item is complete only when its requirement row, source specification, implementation, test, and release gate agree. A green unit test does not prove permission, migration, accessibility, privacy, or rollback behavior unless that layer is tested too.

Current App Time evidence: `TIME-03` maps to `AppTimeScreen`, `getLocalDayRanges`, `aggregateUsagePeriod`, `src/shared/usage.test.ts`, the emulator Day/Week/Month selector and Week refresh smoke, and the 2026-07-27 App-Time-period release note. The feature adds no schema and remains local-only.

Current startup evidence: `START-01` through `START-05` map to `MainApplication`, `YuzuhaBundleInstaller`, `YuzuhaInstallerModule`, `DefaultReactHost(jsBundleFilePath)`, installer metadata/bridge tests, native Kotlin compilation, release APK installation, and emulator/phone startup smoke. The live newer-release path is implemented but awaits a signed endpoint fixture for end-to-end activation evidence.

Current Home evidence: `CROSS-01` maps to `HomeScreen`, shared `period.ts` helpers, period unit tests, emulator selector/range/card smoke, and the 2026-07-27 Home-period release note. The calculation is derived and adds no schema or background behavior.

Current Review evidence: `CROSS-03` maps to `ReviewScreen`, `buildReviewSummary`, `src/shared/review.test.ts`, emulator Today/Week/Month Review smoke, and the 2026-07-27 period-review release note. The screen is source-backed and read-only; persisted reflection and review history remain planned.

Current Money payee evidence: `MONEY-06` maps to `MoneyScreen`, `MoneyPayee`, `moneyPayee.ts`, AppStore payee actions, JSON/CSV/SQLite validation, global-search coverage, the 2026-07-27 Money-payee release note, and emulator Payee-form smoke. Payees use stable IDs; archived records remain valid for existing money entries.

Current Money report evidence: `MONEY-11` maps to `MoneyReportScreen`, `MoneyReportFilter`, `moneyReport.ts`, split-line projection tests, the 2026-07-27 Money-report-filter release note, and emulator report-scope smoke. The filter is derived; transfers and out-of-range entries are excluded and currencies remain separate.

Current week-start evidence: `CORE-04` and `TASK-08` map to `AppData.weekStartsOn`, `getPeriodRange`, Home week-start controls, JSON/SQLite validation, period and Money-filter tests, the 2026-07-27 week-start release note, and emulator weekly-range smoke. Sunday and Monday are the only accepted values.

Current money CSV undo evidence: `INT-02` maps to `MoneyCsvImportReceipt`, `AppStore.importMoneyEntries`, `AppStore.undoMoneyCsvImport`, `DataToolsScreen`, JSON/encrypted-backup/SQLite persistence, `src/shared/moneyCsvImportReceipt.test.ts`, AppStore and SQLite regression tests, and the 2026-07-27 money CSV undo release note. Undo is allowed only for the latest unchanged batch; missing or edited rows block it without a write.

Current note-link evidence: `NOTE-05` maps to `NoteLink`, `noteLinks.ts`, `NotesScreen`, AppStore add/remove actions, SQLite `app_records`, JSON/encrypted-backup validation, `src/shared/noteLinks.test.ts`, AppStore/SQLite/restore/backup tests, and the 2026-07-27 note-link release note. New links require current targets, duplicate links are rejected, and deleted targets remain visible as deterministic deleted-target labels.

Current linked-search evidence: `CROSS-02` maps to `searchGlobal`, `GlobalSearchScreen`, linked-target search helpers, `src/shared/globalSearch.test.ts`, and the 2026-07-28 linked-target-search release note. Active linked target fields can match the owning note, note details explain the relationship, archived project fields require the archived-results option, and deleted target content is excluded without adding a persistent index or background work.

Current rich-note evidence: `NOTE-04` maps to `noteMarkup.ts`, `NotesScreen`, the formatting toolbar and `NoteBodyPreview`, `src/shared/noteMarkup.test.ts`, the current body/search/backup persistence paths, and the 2026-07-28 rich-note release note. Supported markers render locally, unsupported or incomplete markers remain readable, and the body remains a plain string with no schema or dependency change.

Current search-navigation evidence: `CROSS-02` also maps to `globalSearchDestination`, tappable `GlobalSearchScreen` result rows, the result-kind mapping test in `src/shared/globalSearch.test.ts`, and the 2026-07-28 search-navigation release note. All supported kinds route to an existing tab, close Search, and add no data or route record.

Current task-search-focus evidence: `CROSS-02` also maps to `globalSearchNavigation`, `pendingTaskId`, the existing `TasksScreen` focus effect, the task-focus assertion in `src/shared/globalSearch.test.ts`, and the 2026-07-28 task-search-focus release note. Task results load the current task in edit mode.

Current note-search-focus evidence: `CROSS-02` also maps to `globalSearchNavigation`, `pendingNoteId`, the existing `NotesScreen` focus effect, the note-focus assertion in `src/shared/globalSearch.test.ts`, and the 2026-07-28 note-search-focus release note. Note results load the current note in edit mode; other results remain tab-only.

Current money-search-focus evidence: `CROSS-02` also maps to `globalSearchNavigation`, `pendingMoneyId`, the existing `MoneyScreen` focus effect, the money-focus assertion in `src/shared/globalSearch.test.ts`, and the 2026-07-28 money-search-focus release note. Money results load the current entry in edit mode; other results remain tab-only.

## Open decision register

Before a phase starts, move its open decisions into `decision-log.md` with an owner, choice, reason, consequence, and validation plan. Do not treat an unresolved decision as an implementation detail when it changes the data model, user promise, privacy boundary, or release process.
