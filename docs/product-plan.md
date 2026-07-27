# Product plan

Status: Planned baseline for the first implementation.

## Product statement

Yuzuha helps one person see and manage the parts of daily life that are easy to lose across separate apps: money, digital time, notes, and tasks.

The product should feel like a private desk, not a noisy social feed. It should be useful in under one minute, work offline, and show the source and date of every summary.

## Problem

People often track spending, screen time, ideas, and commitments in different places. The data becomes hard to compare and hard to act on. The cost is small but repeated: missed tasks, unclear spending, and poor awareness of how time is used.

## Product goals

- Give the user one daily overview of money, app time, notes, and tasks.
- Make common entries fast: record a transaction, capture a note, or add a task in a few taps.
- Make app-time reporting transparent and permission-aware.
- Keep personal data on the device by default.
- Let the user export or delete their data without contacting support.
- Ship JavaScript updates safely through the installer shell.

## Non-goals for the MVP

- Bank account connections or automatic transaction imports.
- Cloud sync, shared workspaces, social features, or ads.
- Financial advice, investment recommendations, or tax calculations.
- Silent monitoring of app content, keystrokes, or notifications.
- A full project-management system.

## Primary user

An individual who wants a simple personal control panel and is willing to enter a small amount of information manually. The user may be privacy-sensitive and may use the app while offline.

## Product principles

1. Local first: the core experience does not require an account or network.
2. One clear next action: each screen should make the next useful action obvious.
3. Explain the number: summaries show their period, source, and limits.
4. Respect permission: app-time data is unavailable until the user grants Android Usage Access.
5. Safe updates: a new bundle is never used until its integrity and compatibility checks pass.
6. Small history, strong search: the user can find old information without complex setup.

## MVP surface

### Home

Shows today and the current period:

- money spent in the selected period
- app time for the selected period, when permission is available
- open tasks and overdue tasks
- recent or pinned notes

Each card opens the source feature. The home screen must not invent a value when data is missing; it shows `Not available` with the reason.

Home also offers Quick capture. The menu routes to the existing Money, Notes, and Tasks forms so the user can start an entry without first opening a feature card.

### Money

- Add income or expense manually.
- Set amount, currency, date, category, account label, and optional note.
- Edit or delete an entry.
- Filter by period, type, category, and account label.
- Show totals and a simple category breakdown.
- Export entries as CSV or JSON.

### App time

- Explain Android Usage Access before asking for it.
- Show daily totals and a per-app breakdown for a selected period.
- Show when the data was last read and which apps were included.
- Allow the user to exclude apps from the dashboard.
- Keep the raw usage data local.

### Notes

- Create, edit, archive, pin, and delete text notes.
- Add optional tags.
- Search note titles and body text.
- Keep note editing usable with the keyboard open.

### Tasks

- Create a task with title, optional details, due date, priority, and list.
- Mark a task complete and undo that action.
- Sort by due date, priority, or manual order.
- Show overdue, today, upcoming, and completed views.
- Save local task templates and use active templates to create ordinary tasks.
- Android supports one optional local reminder per open task, optional local `HH:mm` reminder times on recurring task rules, local daily quiet hours, separate Task reminders and recurring-task reminder category settings, task dependencies with completed-prerequisite blocking, and `Open`/`Complete`/`Snooze` notification actions with a 15/30/60/120-minute policy; broader notification automation and sync remain planned.

## Success measures

The first release is successful when a test user can:

- complete first setup in under two minutes;
- add a money entry, note, and task in under 30 seconds each;
- understand why app time is missing or stale;
- close and reopen the app without losing data;
- export all user-created records;
- use the main flows with a screen reader and large text.

After a real beta, collect opt-in, non-content metrics only: first-run completion, feature use, export use, crash-free sessions, installer activation success, and time-to-first-content. Do not collect note text, transaction descriptions, or app names without explicit consent.

## Delivery stages

1. Foundation: native shell, installer gate, navigation, local database, migrations, and test harness.
2. Personal records: money, notes, and tasks.
3. Usage insight: Android Usage Access flow, aggregation, exclusions, and dashboard card.
4. Trust and polish: export/delete, accessibility, offline behavior, backup policy, and release hardening.
5. iOS shell and parity: add the iOS target after Android MVP behavior is stable. App-time behavior must be designed separately because Android UsageStatsManager is not portable.

## Risks and responses

| Risk | Response |
| --- | --- |
| Usage Access is misunderstood | Explain the permission, show source and last-read time, and provide a settings link. |
| Money data is lost during a migration | Use versioned migrations, backups before destructive migration, and migration tests. |
| OTA bundle breaks startup | Verify compatibility, activate atomically, retain last-known-good, and support rollback. |
| The dashboard becomes busy | Limit the first screen to four cards and let users reorder or hide cards later. |
| Scope expands into a finance suite | Keep bank sync, advice, and cloud collaboration outside MVP. |

## Planning review questions

Before implementation starts, answer these questions:

- Is the user’s main currency fixed, or can each money entry have its own currency?
- Should money totals include income, or show income and spending separately?
- Which apps should be excluded from app-time reporting by default, if any?
- Is a task list enough for the first release, or are recurring tasks required?
- Should the app support Android backup, and if so, should sensitive data be excluded?
- What is the source of truth and signing process for `updates.yuzuha.dev`?
- What is the minimum Android API level for the first device build?

## Full-product north star

The MVP is a local journal with four features. The full product is a private personal operating system: one place to capture, review, plan, and learn from the user’s own records across devices.

The full product adds capability in layers:

| Layer | User value | Main additions |
| --- | --- | --- |
| Capture | Record something quickly. | Global add, share capture, widgets, imports, templates. |
| Organize | Keep records useful over time. | Projects, folders, tags, links, recurrence, accounts, categories. |
| Review | Understand the current period. | Reviews, budgets, goals, trends, reports, time groups. |
| Act | Turn information into a next step. | Reminders, focus sessions, automation, command actions. |
| Continue | Keep the same personal workspace everywhere. | Optional encrypted sync, backup, recovery, device management. |
| Trust | Stay safe and understandable. | Privacy center, accessibility, localization, support, rollback, deletion. |

The full product remains single-person by default. Shared live workspaces, public profiles, ads, and employer monitoring are not part of this product definition.

## Full-product phase map

### Phase 0 - Contract and foundation

Prove the startup gate, local database, migrations, typed boundaries, and privacy baseline.

### Phase 1 - Core personal records

Ship Home, money, notes, tasks, basic app time, export, delete, and offline use.

### Phase 2 - Planning and insight

Add accounts and categories, budgets, goals, reports, projects, recurrence, focus sessions, and app-time goals.

### Phase 3 - Capture and automation

Add rich notes, links, attachments, saved searches, global capture, reminders, templates, widgets, share actions, deep links, and calendar actions. The current Android slice covers bounded text share preview, confirmed note/task saving, supported image/PDF/plain-text file share preview with note-attachment saving, static shortcuts into Money, Notes, Tasks, and App Time, a low-risk summary widget for open tasks and active notes, strict local deep links to those tabs, and one-way calendar drafts for dated tasks. Dynamic shortcuts, unsupported file types, user-selected widget cards, remote app links, calendar reads, event reconciliation, and selected timezone/calendar preferences remain planned.

### Phase 4 - Continuity and portability

Add optional encrypted sync, device enrollment, conflict resolution, encrypted backup, recovery, import tools, and data portability. The current Android slice already has strict current-format money CSV append and current JSON export file restore paths; arbitrary bank mapping, import history, and sync restore remain future work.

### Phase 5 - Platform and product maturity

Add iOS parity where the platform supports it, localization, accessibility hardening, support operations, performance work, and stable public release practices.

### Phase 6 - Optional integrations

Evaluate financial providers, OCR, advanced automation, and selected third-party integrations only after privacy, legal, support, and regional reviews.

Each phase has to preserve local-only mode and pass the release gates in `implementation-plan.md` and `release.md`.

## Full-product success measures

After the product has users, measure outcomes rather than time spent in the app:

- users can capture an item from any supported entry point and find it later;
- users can complete a review for a chosen period with source and freshness labels;
- synced devices converge without silent data loss;
- exports restore into a new workspace;
- notifications are useful without becoming a source of complaints;
- users can understand and control every permission and data path;
- critical startup, sync, migration, and deletion failures have deterministic handling.
