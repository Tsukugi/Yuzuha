# UX plan

Status: Current Android MVP through the Android calendar-draft pass.

## Navigation

Use a bottom navigation with four destinations: Home, Money, Notes, and Tasks. App time is opened from Home and Settings because it depends on a system permission. Home has a Quick capture action that opens Add money, Add note, or Add task and routes to the existing form without creating a separate capture record.

When Android sends Yuzuha text, show `Shared capture` with the subject/body preview and `Save as note`, `Save as task`, and `Dismiss`. Saving a note uses the subject or first line as its title. Saving a task uses the same title, stores the full text as details, uses Inbox and Normal priority, and routes to Tasks. When Android sends a supported image, PDF, or plain-text file, show its name, MIME type, and known size; offer `Save as note` and `Dismiss`, then store the file as a note attachment after checksum verification. Empty, unsupported, or over-limit payloads create no record. Do not fetch URLs or show shared content on a lock screen before the user opens the app. Launcher shortcuts labeled Add money, Add note, Add task, and App time open the matching existing screen without creating a record. The Android summary widget shows only open-task and active-note counts, updates after committed workspace changes, and opens Yuzuha on tap.

The widget has no setup flow. Its empty state is `0 open tasks · 0 active notes`; it never shows note bodies, task text, money values, or app-time rows. Android does not poll it because its update period is zero.

Android deep links use the exact routes `yuzuha://open/money`, `yuzuha://open/notes`, `yuzuha://open/tasks`, and `yuzuha://open/app-time`. Each opens the matching existing tab. A link with a query, fragment, ID, extra path, unknown target, or remote scheme is ignored and does not create a record.

## First run

1. Welcome: explain that data stays on the device by default.
2. Main currency: choose a default currency; allow later changes without rewriting old entries.
3. App time: explain Usage Access, with `Not now` as a valid choice.
4. Home: show the four cards with honest empty states.

Do not force account creation, cloud sync, or Usage Access permission during onboarding.

## Home card behavior

| Card | Populated state | Empty or unavailable state |
| --- | --- | --- |
| Money | Period total and entry count. | `Add your first entry` or `No entries in this period`. |
| App time | Total duration, last-read time, and top apps. | `Allow Usage Access` or `No usage data for this period`. |
| Tasks | Open count, overdue count, and next due task. | `All clear` with add action. |
| Notes | Pinned and recent notes. | `Create a note`. |

## Important flows

### Add money

The form asks for type, amount, currency, category, date, account label, and note. Validation is inline. The save action remains disabled until required fields are valid. After save, return to the previous context and show the updated total.

### Read app time

The permission explanation appears before the system settings page. After returning, the app checks permission again, reads the selected range, stores a local snapshot, and shows the read timestamp. If permission was not granted, the app remains useful and explains how to try again.

### Manage tasks

The form asks for a title and optional details, local due date, priority, and list. The current release seeds one `Inbox` list and lets the user add, rename, archive/restore, and delete unused custom lists. Inbox cannot be archived or deleted. Edit loads the same fields into the form. Complete/reopen is a direct status toggle. Delete always asks for confirmation. Task views are All, Overdue, Today, Upcoming, and Completed. Overdue means an open task whose local due date is before today; completed tasks stay out of the open-date views.

Tasks can optionally link to a local project. The Tasks screen can create, rename, complete/reopen, archive/restore, and delete projects; deletion is blocked while any task still links to the project. Archived projects remain visible on existing tasks but are not offered for new links.

Tasks can also have one optional parent task from the same list. The parent selector is hidden for the task being edited, and the save is rejected if the link would cross lists or create a cycle. Task rows show the parent title and direct subtask count. Deleting a parent promotes its direct children; deeper subtasks keep their existing parent links.

The Tasks screen also manages local task templates. A template has a unique name, task title/details, priority, list, and optional project. The user can add, edit, archive/restore, delete, or use an active template. Using one creates a normal open task without a due date, parent, recurrence, reminder, or source-note link. Archived templates stay visible but have no Use action.

The recurring-task form asks for a title, details, first due date, optional local reminder time in `HH:mm`, interval, day/week/month cadence, priority, list, and missed-occurrence policy. Saving stores a local rule. On startup, due rules create open tasks with deterministic rule/date IDs, copy the optional reminder time into each generated task, then advance the next date. All creates every due task, One creates the first due task, and Skip creates none. Rules can be paused/resumed or deleted; deleting a rule keeps existing tasks and clears their rule link. A generated reminder whose local date/time is already past is not scheduled.

The Task view has List and Agenda modes. Agenda shows dated tasks grouped for the next 14 device-local calendar days and keeps completed tasks in their date group. Undated tasks stay in List mode. List mode can sort by Manual, Due date, or Priority. Manual order is stored per task list; the All list view exposes Up and Down controls when Manual sorting is selected, while Due date puts undated tasks last and Priority puts High before Normal before Low. The current agenda does not expose a timezone or week-start preference; those settings are a later product contract.

The task form also has one optional reminder field in strict `YYYY-MM-DDTHH:mm` local time. A reminder must be in the future. Saving asks for Android notification permission when required; denial leaves the task saved without a reminder and shows the error. Replacing or clearing a reminder cancels the old schedule. Completed tasks cannot keep an active reminder. The Notification settings card has a Task reminders On/Off switch. Off clears native reminder alarms but keeps logical reminder times; On rebuilds future alarms. It also accepts an optional daily `HH:mm` start and end; both fields are required when enabled, equal values are rejected, and clearing both disables quiet hours. It lets the user choose a snooze duration of 15m, 30m, 1h, or 2h; the default is 1h. A reminder inside the same-day or overnight window is delivered at the local window end. The notification uses generic text rather than task details; tapping it opens the matching task in edit mode, `Complete` marks the existing open task complete without reopening it, and `Snooze` sets a new reminder using the selected duration when the category is enabled.

### Add a task to the calendar

A task row shows `Calendar` only as a one-way Android draft action. The task must have a non-empty title and a valid local due date. Tapping it opens the system calendar editor with the task title, details, and an all-day date. Yuzuha does not request calendar permission, read calendar data, store an event ID, or change the task. A task without a due date shows `A valid due date is required before adding the task to the calendar.`

### Search notes

Notes has a local search field. It matches title, body, normalized tags, and attachment file names case-insensitively. Results show the title, a short body preview, tags, attachments, and updated time. An empty query shows all notes; a query with no matches shows an honest empty state. Search never reads attachment bytes or sends note content to a server.

Notes also supports editing a saved note, pinning it, archiving/restoring it, and deleting it after confirmation. Archived notes are hidden by default. Show archived notes reveals them for review or restore, and pinned notes appear first. Deleting a note also removes its attachment metadata and private files.

When a note query is non-empty, Notes can save it under a local name. Saving also records whether archived notes are included. The saved-search list shows the name and query, Apply restores both values, and Delete requires confirmation. Saved searches stay on the device and are included in local exports and encrypted backups; they are not global or synced searches.

Each note has a `Make task` action. It creates a new open task using the note title and body, leaves the note unchanged, and shows the source note title in Tasks. If the note is later deleted, the task shows `Deleted note` instead of losing the task.

### Search the workspace

Home opens a local Search screen. The screen searches supported money, notes, tasks, saved searches, accounts, categories, transfers, splits, budgets, recurring rules, time goals, and app-time metadata. Search is case-insensitive and shows a result kind, title, and detail. Archived results are hidden by default and can be included with one explicit control. App-time results appear only when Usage Access is granted and the snapshot is included. An empty query explains how to start, and a query with no matches shows `No matches in the selected records.`

### Add a note attachment

Each saved note has a comma-separated optional tag field and an `Add attachment` action. Tags are trimmed, lowercased, deduplicated, and limited to 20 tags of 40 characters each. The system picker allows images, PDFs, and plain-text files. Yuzuha copies the selected file into private app storage, checks its name, size, type, and SHA-256 checksum, then saves the metadata under the note. Android shows an `Open attachment` action for supported files and hands one read-only FileProvider URI to the system chooser. If no Android viewer can open the file, the note shows the native error. iOS preview remains planned. The note shows its tags, file names, and sizes. Removing an attachment deletes the private file before removing its metadata. A note can have at most 10 attachments and each file can be at most 10 MiB. Canceling the picker leaves the note unchanged.

### Export and delete local data

The Home screen links to Data tools. The user can share a complete JSON export or a money-entry CSV through the Android system share sheet. The screen states what each format contains and reports when the share action returns. Delete uses a destructive confirmation with a clear list of affected local records; after confirmation, the app shows the empty workspace defaults and does not imply that a remote copy was deleted.

### Create a recurring money rule

Money includes a recurring-rule form for expense or income, amount, category, account, cadence, interval, local start date, missed-date policy, and note. The user chooses All, One, or Skip before saving. All creates every missed date, One creates the first missed date, and Skip creates none; each choice advances the rule beyond the missed range. Saving a rule creates due entries immediately and shows the next local calendar date. Reopening the app advances only due dates that have not already generated a deterministic entry. Rules can be deleted from the recurring-rules list.

### Restore local data

Data tools accepts a pasted Yuzuha JSON export. Preview shows the total and record groups before any write. Restore is destructive: the user confirms the replacement, and invalid JSON or invalid records leave the current workspace unchanged.

### Create or restore an encrypted backup

Data tools asks for a password of at least 12 characters before sharing or saving a password backup. New encrypted backups include verified note attachment bytes; plain JSON exports remain metadata-only. It can also generate a separate high-entropy recovery key, requires the user to re-enter it, and saves a recovery-key backup without storing the key. Save opens the system document picker with a suggested JSON file name. Restore can use pasted text or the system document picker; it accepts the backup password or recovery key, decrypts and validates the contents and attachment checksums, shows the creation date, credential type, and record count, and requires a destructive confirmation before replacing local data. A plain JSON restore with attachments is rejected because it has no file bytes. Canceling a picker leaves the workspace unchanged. Wrong credentials and tampered backups do not change the workspace.

## Accessibility

- Every control has an accessible label and a useful state description.
- Touch targets are at least 44 dp.
- Color is not the only way to show income/expense, priority, overdue, or completion.
- Layout works at large system font sizes without clipped text.
- Focus order follows the visual order.
- Motion is limited and respects reduced-motion settings where supported.
- Forms announce validation errors and save success.

## Content rules

Use plain, specific messages. Examples:

- `Usage Access is off. Android has not shared app-time data with Yuzuha.`
- `This bundle could not be verified. Your saved version is still safe.`
- `No spending recorded for this period.`

Avoid blame, alarm, and vague messages such as `Something went wrong` without an action or reason.

## Full-product navigation

The Android phone layout keeps Home, Money, Notes, and Tasks in the primary bar. Projects, App Time, Reviews, Reports, Search, and Settings are reachable from Home or a global command surface. On larger screens, a navigation rail and two-pane layouts may expose the same destinations without changing data behavior.

## Full-product flows

### Enable sync

The Privacy Center explains local-only and synced modes side by side. The user chooses what to sync, creates or confirms recovery material, enrolls the current device, and sees a first-sync preview. The app reports `Not started`, `Syncing`, `Up to date`, `Paused`, `Needs attention`, or `Conflict needs review`.

### Create a budget

The user chooses category, currency, period, amount, start rule, and rollover policy. A preview shows how existing transactions will count. Save creates the budget and its optional alert; it does not alter transactions.

### Import money

The flow is choose file, map fields, review duplicates, preview totals/errors, commit, and show import history. Cancel leaves the database unchanged. The import report can open the affected records.

### Create recurring work

The user chooses a template, recurrence, timezone, missed-occurrence rule, and reminder. The preview shows the next three occurrences. Editing one occurrence versus the series is an explicit choice.

### Resolve a conflict

The conflict screen shows local and remote versions, changed fields, source device, and time. For money, it offers `Keep local`, `Keep remote`, `Keep both`, or `Edit merged copy`; it never picks a total silently. Resolution creates a new revision and records the choice.

### Daily review

The review is a sequence of source-backed cards. Each card can open the source list, filter the period, or be dismissed for the current review. Reflection text is optional and stays with the review record.

## Full-product screen map

| Area | Screens |
| --- | --- |
| Home | Dashboard, daily review, weekly review, card settings. |
| Money | Transactions, entry form, accounts, categories, budgets, goals, reports, imports. |
| App time | Summary, app groups, goals, focus sessions, permission details. |
| Notes | Note list, editor, folders, tags, saved searches, attachment picker. |
| Tasks | Inbox, lists, project, calendar, agenda, recurrence rules, templates. |
| Search | Global search, filters, saved searches, command results. |
| Settings | Appearance, locale, notifications, permissions, integrations, sync/devices, export/delete, support. |

## Full-product empty and failure states

Every advanced feature has a useful local-only state. Examples:

- Sync: `You are using this device only. Turn on sync when you want another device to share this workspace.`
- Budget: `No transactions match this budget period.`
- Import: `No changes were saved. Review the rows and try again.`
- Conflict: `Both devices changed this item. Choose which version to keep.`
- Integration: `Calendar access is off. Existing Yuzuha tasks are unchanged.`
- Search: `No matches in the selected filters.`

## Phase 4 shipped controls

Money opens a report from the entry screen. Day, week, and month are explicit choices. Each currency is shown in its own card with spending, income, net, and category rows. Empty periods show a clear no-entry state.

## Money transfer shipped controls

Money has an `Add transfer` flow. The user chooses two active accounts, enters a positive amount in their shared currency, and can add a note. The screen shows account balances and transfer history. Transfers are explicitly described as excluded from income and spending reports. With fewer than two active accounts, the flow explains that a second account is required.

## Split entry shipped controls

Money has an `Add split entry` flow. The user chooses the parent type and account, enters the parent amount, then enters at least two category lines. Save rejects missing, invalid, or non-reconciling lines with an inline message. After save, reports show the line categories and the split screen shows the parent total and delete action.

## Budget shipped controls

Money opens a Budgets screen. The user chooses an active expense category, currency, day/week/month period, and limit. The screen shows used, remaining, percentage, and `On track`, `Near the budget limit`, `Over budget`, or `No spending yet`. Delete removes the local budget record.

## Phase 3 shipped controls

Money rows open in edit mode. The user can update or delete the entry, and the screen clearly shows the editing state. Account and category management uses archive instead of hiding records. The last active account shows a disabled archive action.

App Time shows an Include/Exclude action for each package. Excluding a package updates the total immediately and keeps the permission/read state visible. The weekly goal form accepts a name, daily or weekly period, and minutes, then shows current progress.

The App Time screen also has local Focus sessions. The user can start one manual session with optional task, project, note, and app-group links, see a live elapsed value while the screen is open, then Complete or Stop it. Recent sessions show their duration and links. App groups are named package lists; they can be archived or deleted when unused. This flow does not block apps or run a background timer.

## Phase 2 shipped flow: App Time

Home shows `Not connected` and `Set up access` until the user grants Android Usage Access. The flow opens the system Usage Access screen, returns to Yuzuha, checks permission again, and exposes `Refresh usage`. A successful read shows today’s duration, the last-read date, and top app rows. A failed or empty read names the source and leaves the rest of the app usable.
