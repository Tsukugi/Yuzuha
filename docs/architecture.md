# Architecture

Current schema boundary: the latest Android slice accepts app schema 32 and repository schema 3 only. The note-link, linked-target-search, and rich-note passes add no schema beyond the stable local links from notes to tasks, projects, money entries, and focus sessions; older schemas remain rejected without migration.

Status: Core implementation through the Android budget-search-focus pass with the full-product target architecture. The installer bridge, SQLite repository boundary, app shell, core screens, reports, account balances, transfers, split entries, normalized financial tables, budget projections, exports, local deletion, recurring money and task rules with missed-occurrence policies, reminders, projects, templates, focus sessions, tasks, notes, bounded rich-note rendering, attachments, share/capture adapters, launcher/widget/deep-link adapters, current-format imports/restores, selected App Time/Home/Review periods, Money filters/totals/reports, the persisted week-start setting, latest-import undo, note links, local linked-target search, owning-tab search navigation, and exact money, note, task, project, task-template, task-list, app-group, and budget focus from search exist. App groups and budgets also have local edit controls. The accepted latest-only data boundary is app schema 32 and repository schema 3. Selected timezone, calendar reads/event IDs, broader notification automation, dynamic shortcuts, iOS share handling, app blocking, sync, and advanced adapters remain planned.

Current pass addition: Notes support stable links to tasks, projects, money entries, and focus sessions. Data tools keep their bounded current-format import, latest-import receipt/undo, JSON restore, and encrypted-backup file boundaries unchanged apart from carrying the new current workspace collection.

Current App Time addition: the Android report can select Today, This week, or This month. `getLocalDayRanges` splits the selected local period into one native query per local day. Queries run sequentially, snapshots are aggregated with the queried day as their local date, and `replaceUsageSnapshots` runs once after all queries succeed. The selected range is a derived view and adds no schema, worker, timer, or polling loop.

Current startup installer addition: `MainApplication` starts `YuzuhaBundleInstaller` before the React host is created. The installer performs one bounded HTTPS metadata request, validates the current Android/runtime/native-version fields, verifies the signed canonical metadata with the pinned Ed25519 public key, downloads a newer bundle into an app-private temporary file, checks its exact size and SHA-256, and atomically promotes both the immutable bundle and activation state. A valid remote bundle is passed to `DefaultReactHost` through `jsBundleFilePath`; otherwise the newest verified private bundle or embedded asset is used. JavaScript reads only the native launch status through `YuzuhaInstaller`. The Android minimum API is now 33 so the supported shell has the required Ed25519 runtime.

Current Home period addition: `HomeScreen` derives one local Day/Week/Month range with the shared period helpers. Main-currency money totals, included app-time totals, open-task due counts, and recent note updates use that same range. The selector is local component state; it does not write AppData, change usage permission state, refresh native data, or start a timer.

Current Review addition: `ReviewScreen` uses `buildReviewSummary` over a selected local period. The helper returns main-currency income/expense, included usage duration, open tasks due in the range, completed tasks updated in the range, current overdue open tasks, and active notes updated in the range. The screen is read-only and links to existing feature screens; it adds no record or background operation.

Current Money filter addition: `MoneyScreen` applies one typed derived filter to the existing non-split entry list and its totals. It supports All/Day/Week/Month, expense/income, category, and account choices, keeps an archived selected category or account visible, groups totals by currency without floating-point math, and adds no schema, migration, network request, or background operation.

Current Payee addition: `MoneyScreen` offers optional payee selection, local payee creation, and archive controls. `MoneyEntry.payeeId` is validated against the current payee records, included in current JSON/CSV/encrypted-backup data, stored in the normalized SQLite money table, and searched by the global search adapter. The pass raises the accepted app schema to 29 and repository schema to 3, with no compatibility migration.

Current Money report addition: `MoneyReportScreen` applies one derived local period/type/category/account filter to source entries and split lines. It discloses the exact range, selected filters, transfer/out-of-range exclusions, and per-currency scope. Category matching uses stable category IDs, while the report adds no stored filter state or background operation.

Detailed schema numbers in older implementation paragraphs below are historical pass notes. The current boundary above is authoritative: app schema 32 and repository schema 3 only.

Current week-start addition: Home saves Sunday or Monday as `AppData.weekStartsOn`. Home, Review, Money entry filters, Money reports, App Time, and budget projections pass that value to the shared local-period helper. The setting is persisted as current local data; it adds no worker or network request.

Current note-link addition: `AppData.noteLinks` stores one stable local link record per note/target pair. `AppStore` requires the note and target to exist when creating a link, but keeps a link when a target is later deleted so Notes can show `Deleted ...`. Deleting the note removes its owned links. JSON validation, encrypted backup, and SQLite `app_records` persistence carry the collection under app schema 32; no global index, sync object, worker, or network request is added.

Current linked-target-search addition: `searchGlobal` keeps its derived in-memory projection and adds current linked target fields to the owning note's search values. It appends `Linked ...` labels to note details, gates archived project fields with the existing archived-results option, and excludes missing target content from searchable values. No persistent index, schema, sync object, worker, or network request is added.

Current search-navigation addition: `globalSearchDestination` maps every supported result kind to one existing tab. `GlobalSearchScreen` renders each result as a local button, closes the overlay, and changes `MainApp` tab state. Money, task, note, project, task-template, task-list, app-group, and budget results additionally pass their stable IDs through `globalSearchNavigation` into the existing `MoneyScreen`, `MoneyBudgetScreen`, `TasksScreen`, `NotesScreen`, and `AppTimeScreen`/`FocusSessionPanel` focus paths, which load the current record into edit mode. Other kinds have no record ID route or exact-record focus; no schema field, network request, or background work is added.

Current rich-note addition: `Note.body` remains a plain string. `noteMarkup.ts` parses only the supported inline markers and line prefixes for the Notes card, while toolbar actions apply deterministic edits to the same string. Unknown or incomplete markers render as plain text. Search, task conversion, JSON/encrypted-backup data, and SQLite persistence consume the unchanged body field; the money CSV flow is unchanged. No rich-text dependency or schema field is added.

The detailed system-shape paragraphs below retain earlier pass wording where noted; the current schema and startup rules above are authoritative.

## System shape

Task-list, task-subtask, task-dependency, task-agenda, and task-reminder actions stay in the local AppStore boundary. List names are validated before save; list deletion checks task and recurring-rule references before changing the workspace. A parent link points to one existing task in the same list, rejects self-links and cycles, and deleting a parent promotes its direct children in the same workspace save. A dependency points from a prerequisite task to a dependent task, supports the `completed` condition, rejects self-links, duplicates, and cycles, and prevents completion while any prerequisite is incomplete. Deleting a task removes its dependency edges in the same workspace save. The agenda is a derived 14-day view over `dueLocalDate` using the device's local calendar; it does not add a persisted record or claim a user-selected timezone. Week-based views use the persisted Sunday/Monday setting. Due task rules are expanded in the same startup save that expands money rules, before `MainApp` receives workspace data. Startup then synchronizes future reminders for open tasks only when the global Task reminders category is enabled and, for tasks linked to a recurring rule, when recurring-task reminders are enabled. Android reminder intents carry only the stable task ID and an `Open`, `Complete`, or `Snooze` action. `Complete` performs one open-to-completed transition and preserves the logical reminder timestamp; `Snooze` replaces the logical reminder with the selected duration after the action time and applies quiet-hours projection to the native alarm. A paused category clears its native schedules, keeps logical timestamps, and makes stale `Snooze` actions no-ops. Missing or completed targets are no-ops; a blocked target remains open. Restore synchronizes the incoming reminder set before commit and restores the previous native set if the restore fails.

Home owns the local Quick capture menu. It presents only the existing Money, Notes, and Tasks targets, and selecting a target changes the active tab so the normal blank form owns validation and saving. The menu has no persistence or native background work.

Android share capture is an entry-point adapter, not a new repository record. The `singleTask` activity accepts text and supported `EXTRA_STREAM` files, removes consumed extras, and passes bounded metadata through `YuzuhaShareCapture`. Text is limited to 20,000 characters. Images, PDFs, and plain text files are limited to 10 MiB, require a provider name and supported MIME type, and are copied through the existing `keepLocalCopy`/private-file/checksum path only after the user confirms. `MainApp` subscribes to warm intents and reads the cold-start payload once. A deterministic key suppresses duplicate cold/warm delivery. Text saves through the existing note or task AppStore methods; file shares save a note and attachment in one workspace commit. Nothing is committed before confirmation.

Android launcher shortcuts are static manifest resources with four actions: Money, Notes, Tasks, and App Time. `YuzuhaLaunchActions` normalizes only those action strings, clears the consumed activity action/extras, emits warm launches, and provides the cold-start action getter. `MainApp` maps each action directly to the existing tab and closes any transient share preview. The launcher never receives record content.

The Android summary widget is a derived platform projection. `AppStoreProvider` builds two counts from the loaded workspace after each committed save: open tasks and non-archived notes. `YuzuhaWidgetModule` writes only those counts to app-private preferences and asks `YuzuhaSummaryWidgetProvider` to refresh placed widgets. The provider uses `RemoteViews`, `updatePeriodMillis=0`, and a `PendingIntent` to `MainActivity`. It stores no record text, schedules no worker, and does not change the SQLite schema. If the bridge is unavailable, the database remains authoritative and the app continues without the widget projection.

Android deep links are a typed local entry-point adapter. `DeepLinkModule` accepts only `ACTION_VIEW` with the exact `yuzuha://open/{money|notes|tasks|app-time}` route, clears the consumed intent, and delivers the canonical URI through a cold-start getter or warm-app event. `MainApp` maps the validated target to an existing tab. Query strings, fragments, extra paths, IDs, and remote URLs are rejected before JavaScript routing; no record or network path is involved.

Android calendar drafts are a narrow system adapter. `calendarDrafts` validates a task title, details, and strict local `YYYY-MM-DD` due date. `CalendarDraftModule` converts the date to a device-local all-day interval and opens `CalendarContract.Events.CONTENT_URI` with `ACTION_INSERT`. It does not request `READ_CALENDAR` or `WRITE_CALENDAR`, read calendar rows, keep an event ID, create an AppData record, or schedule background work. The user owns the final save in the external calendar editor. `LaunchActionsModule` leaves unknown actions untouched so a separate deep-link adapter can inspect the same cold-start intent.

Money CSV import is a file-picker adapter over the existing money records. `openMoneyCsvImportFile` copies one selected CSV to cache, bounds its size, reads it once, and passes it to the strict current-schema parser. The parser preserves entry IDs/timestamps, requires existing account/category references, rejects split-linked rows and duplicates, and returns a preview with currency totals and row errors. `AppStore.importMoneyEntries` appends the validated entries in one transaction and records only the latest receipt. `undoMoneyCsvImport` removes that batch only when every receipt ID still exists with the original `createdAt` and `updatedAt`; a missing or edited entry causes a clear error and no write. The receipt is persisted in JSON, encrypted backups, and SQLite metadata. No legacy import path or background job is added.

JSON export file restore is a file-picker adapter over the existing JSON validator. `openJsonImportFile` copies one selected current JSON export to cache, bounds its size, reads it once, and passes it to `parseJsonImport`. Data tools reuse the existing record-count preview and destructive restore confirmation; no workspace write happens during file selection or validation, and the cache copy is removed after the read.

Encrypted backup file opening checks the picker-reported size before `keepLocalCopy`, then checks the cached file's `FileSystem.stat` size before `readFile`. The 96 MiB bound is below the unbounded-input risk while leaving room for the existing 64 MiB plaintext limit and base64 envelope overhead. Oversized input is rejected deterministically and any cache copy is removed in `finally`.

Yuzuha uses a local-first feature architecture. The installer is a native-shell concern and runs before the JavaScript product shell is shown.

```mermaid
flowchart TD
    OS[Android or iOS shell] --> G[Bundle gate]
    OS --> SHARE[Android text share]
    OS --> WIDGET[Android summary widget]
    OS --> LINK[Android local deep link]
    G --> B[Verified JavaScript bundle]
    B --> APP[MainApp]
    SHARE --> APP
    WIDGET --> APP
    LINK --> APP
    APP --> CAL[Android calendar editor draft]
    APP --> NAV[Navigation]
    NAV --> HOME[Home dashboard]
    NAV --> MONEY[Money]
    NAV --> TIME[App time]
    NAV --> NOTES[Notes]
    NAV --> TASKS[Tasks]
    NAV --> SEARCH[Search]
    HOME --> USE[Use cases]
    MONEY --> USE
    TIME --> USE
    NOTES --> USE
    TASKS --> USE
    SEARCH --> USE
    USE --> REPO[Typed repositories]
    REPO --> DB[(SQLite product database)]
    USE --> SYS[Native system adapters]
    SYS --> USAGE[Android UsageStatsManager]
```

## Layer rules

### Native shell

Owns the embedded bundle, bundle metadata request, download, hash/signature verification, atomic activation, and the launch gate. It must not contain money, note, or task rules.

### JavaScript application shell

Owns navigation, theme, startup state, error boundaries, and feature composition. `MainApp` is rendered only after the installer returns a verified launch result.

### Feature modules

Each feature owns its screens, view models/hooks, validation, and use cases. Features call typed repositories or system adapters; they do not call SQLite or native APIs directly from UI components.

### Data layer

Owns the current schema, transactions, repositories, and serialization. Product records belong in SQLite. There is no AsyncStorage product-data path.

### Native system adapters

Hide platform APIs behind typed interfaces. The first Android adapter is app usage access. Future iOS adapters must implement the same interface only when the behavior has an honest platform equivalent.

## Startup sequence

1. Native shell loads the embedded baseline and reads the last verified bundle record.
2. Installer validates local metadata and selects the last-known-good bundle as the provisional candidate.
3. Installer fetches remote metadata with a bounded timeout.
4. If the remote version is newer and compatible, installer downloads to a temporary path.
5. Installer checks size, SHA-256, signature, and bundle compatibility.
6. Installer atomically promotes the verified file and writes the activation record.
7. JavaScript starts from the selected verified bundle.
8. `MainApp` opens the local database, requires repository schema 3 and app schema 32, and renders the first screen.

If a step fails, the installer returns a named result such as `offline-local`, `invalid-remote`, or `no-verified-bundle`. The UI may explain the result, but it must not silently run an unverified file. See `installer.md`.

## Planned module tree

```text
src/
  app/                 startup state, navigation, theme
  features/
    home/
    money/
    appTime/
    notes/
    tasks/
  data/                database and repositories
  platform/            Android and iOS adapters
  installer/           JavaScript-side installer bridge and status types
  shared/              validation, dates, formatting, error types
```

## Key technology decisions

- React Native 0.86.0, React 19.2.8, TypeScript 5.9.x, Metro 0.86.x, and CLI 20.2.x are the current implementation baseline. This supersedes the older planning baseline.
- TypeScript strict mode is required.
- `@op-engineering/op-sqlite` `17.1.2` is the current product store bridge. The app-owned repository boundary keeps native SQL out of feature UI and uses transactions for full-workspace writes.
- Product data does not use AsyncStorage. Preferences and installer metadata need their own explicit owner before they are added.
- Navigation, SQLite binding, encryption, and analytics packages must be selected from maintained packages during implementation and recorded in `decision-log.md`.
- No remote sync layer is required for the MVP.

## Current repository boundary

`SqliteWorkspaceStore` keeps non-financial records, notes, attachments, projects, task templates, app groups, focus sessions, recurrence rules, tasks, task parent links, and task dependencies as typed JSON rows and stores money entries, transfers, split parents/lines, and budgets in normalized tables. It opens only repository schema 2 and rejects older or unknown repository schemas. A new database is seeded with the current empty app data; there is no legacy AsyncStorage import. Malformed current records block the workspace instead of guessing or discarding data. Money reports, account balances, and budget projections are rebuildable projections over loaded source records and never combine currencies. Transfers are source records, not income or expense rows. Split entries are one parent record plus normalized lines and are expanded only in report projections. Budgets count matching expense entries and split lines within their local period; carry-forward adds only the previous period's unused positive balance to the current effective limit. Data tools serialize current app schema 28 records as versioned JSON, serialize money entries as versioned CSV, import only the current money CSV format through a bounded preview/append path, open current JSON export files through a bounded preview/replacement path, share through Android's system sheet, create password-encrypted or local recovery-key XChaCha20-Poly1305 backups using scrypt and secure random salt/nonce values, save encrypted backup JSON through the system document picker using an app-cache temporary file, open encrypted backup JSON through the document picker, validate current-schema pasted or opened JSON/decrypted backup content before preview, replace the workspace only after confirmation, and reset to empty workspace defaults only after confirmation. Recovery keys are generated in memory, confirmed, and never stored. Note attachment files are copied from the system picker into app-private document storage, checked for supported MIME type, size, and SHA-256 checksum, and linked to one note by stable metadata. Current encrypted backup schema 2 payloads include each verified attachment file as authenticated base64 with its ID, size, and checksum. Plain JSON restore does not accept attachments because it has no file bytes. On Android, Notes passes one validated attachment path and MIME type to a native FileProvider bridge; the bridge keeps the file under the app-private attachments directory and gives the external viewer read access only to that URI. Recurrence rules use local calendar dates, generate due money entries once according to their all/one/skip policy, and advance their next date transactionally before the workspace is shown.

Saved searches, task projects, task templates, app groups, focus sessions, task parent links, and task dependencies are stored as typed JSON rows in `app_records` under current app schema 28. The Notes screen owns the local name/query/archive-visibility rules and calls the repository through `AppStore`; Apply and Delete do not introduce a global index or sync state. The Tasks screen owns project controls, template controls and task creation, optional task-project and parent-task selection, prerequisite/dependent selection, manual order controls, and deletion. App Time owns app-group controls and the one-active-session manual timer; the repository validates project references, template fields and references, task references, parent-task list membership and cycles, focus-session states, dependency cycles, and per-list sort order before restore or save.

Global search is a derived local projection over the loaded `AppData`; it does not add a database table or index. The Search screen searches supported records in memory, hides archived records unless requested, and only searches included app-time snapshots after Usage Access is granted. Note results also use current linked target fields and explain the relationship with `Linked ...` labels. Missing target content cannot match because deletion removes it from the local collections.

Tasks created from notes store `sourceNoteId` in the task record. The source note is not changed, and a missing source ID remains valid so the Tasks screen can show `Deleted note` after the source is removed.

Recurring tasks store their own title, details, priority, list, local cadence, interval, next date, missed-occurrence policy, optional local `HH:mm` reminder time, and pause state. Startup expansion creates open task records for due dates, copies the rule reminder time into each generated task's local timestamp, and advances the rule beyond every missed date in one repository save. Past generated reminder timestamps are retained as logical values but are not scheduled because the active reminder projection only includes future times. Open tasks can also store one future local reminder timestamp. `taskDependencies` stores prerequisite/dependent task pairs with the local `completed` condition; an incomplete prerequisite blocks completion, and deleting a task removes its edges. `notificationSettings` stores an optional daily local start/end pair, a local snooze duration of 15, 30, 60, or 120 minutes, a global Task reminders switch, and a recurring-task reminders switch. The AppStore keeps the logical task timestamp in `AppData` and projects it through the quiet-hours window before scheduling only when the relevant switches allow it. The Android adapter schedules the projected time with a stable task ID, cancels it on completion/delete/clear, posts privacy-safe notification text, rebuilds alarms after boot, and passes the task ID through cold-start and warm-app notification intents so the Tasks screen opens the matching task in edit mode. Notifications addressed to the rule itself, background automation, dynamic or cross-feature templates, and series editing remain planned.

## Error boundaries

Every layer returns typed errors with a stable code and user-safe message. UI code decides how to display the error. Logs may include technical context, but never note bodies, transaction descriptions, or raw usage records.

## Developer note: installer-aware changes

Any change that touches startup order, bundle cache paths, metadata fields, version comparison, verification, or activation must update `installer.md`, add or adjust installer tests in `testing.md`, and add a release checklist item in `release.md`. A feature is not complete until the bundle gate still runs before `MainApp`.

## Full-product components

The full product adds these components without weakening the installer boundary:

- `sync`: encrypted outbox, pull cursor, change application, conflict records, device state;
- `crypto`: native key storage, workspace keys, recovery and backup encryption;
- `search`: local full-text index, filters, rebuilds, and delete cleanup;
- `scheduler`: reminders, recurrence, quiet hours, and bounded background work;
- `imports`: staged parsers, mapping, duplicate detection, and rollback;
- `integrations`: share, widgets, calendar, shortcuts, deep links, and file picker adapters;
- `reports`: period queries, currency separation, budgets, goals, and review summaries;
- `support`: redacted diagnostics and user-controlled support package generation.

## Full-product data flow

```mermaid
flowchart LR
    UI[Feature UI] --> UC[Use case]
    UC --> TX[Local transaction]
    TX --> DB[(Encrypted local database)]
    TX --> OUT[Encrypted sync outbox]
    OUT --> SYNC[Sync engine]
    SYNC --> API[Sync service]
    API --> SYNC
    SYNC --> CONFLICT[Conflict records]
    CONFLICT --> UI
    UC --> SCHED[Scheduler]
    SCHED --> OS[OS notification/widget/calendar APIs]
    UC --> INDEX[Search index]
    INDEX --> UI
```

Local commit is the user-visible source of truth. Sync, search indexing, notifications, and integration writes consume committed changes and must be idempotent. None of them may partially commit a feature record.

## Service boundary

The installer service publishes signed JavaScript bundles. The sync service stores encrypted change envelopes. They have separate credentials, deployments, logs, rate limits, incident paths, and release approvals. A bundle update must never require a sync account, and a sync outage must not block local app use.

## Platform capability model

Native adapters expose capability queries rather than platform checks spread through UI code:

```ts
type Capability =
  | 'usageAccess'
  | 'notifications'
  | 'calendarRead'
  | 'calendarWrite'
  | 'widgets'
  | 'shareCapture'
  | 'shortcuts'
  | 'backgroundRefresh';
```

Each capability returns `available`, `permissionRequired`, `restricted`, or `unsupported`, with a user-safe reason. The UI renders the result and a next action.

## Full-product architecture constraints

- Financial totals are calculated from committed transaction records, never from telemetry or cached card values.
- Search indexes and notification schedules are rebuildable projections.
- Attachments are content-addressed by checksum and are not considered committed before the database and file agree.
- Sync applies remote changes inside a database transaction and writes a conflict record instead of choosing an unsafe merge.
- A future migration, if approved after public release, must update schema, projections, sync encoding, export schema, and fixtures together.
