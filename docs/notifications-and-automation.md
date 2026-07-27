# Notifications and automation

Status: Android task reminders, recurring-task reminder times, local daily quiet hours, separate global and recurring-task reminder category pauses, task dependency blocking, and `Open`/`Complete`/`Snooze` reminder actions with a local duration setting are implemented; broader notification and automation capability remains planned.

## Current Android scope

The current release supports one optional local reminder on each open task and one optional local `HH:mm` reminder time on each recurring task rule. A generated occurrence copies the rule time into its task reminder timestamp; future timestamps are synchronized immediately, at startup, and after boot, while past timestamps are not scheduled. The user enters one-off reminders as `YYYY-MM-DDTHH:mm`, grants Android notification permission when needed, and the app schedules one stable task ID with `AlarmManager`. Startup and device boot rebuild future schedules when the relevant reminder categories are enabled. Turning a category off clears its native reminder alarms but keeps each logical task reminder time; turning it back on rebuilds future alarms. Task dependencies link a prerequisite to a dependent task, reject cycles, and keep a dependent task open until its prerequisite is completed. Completing, deleting, clearing, or replacing a reminder cancels the old schedule. The notification text is privacy-safe. Its content opens the matching task in edit mode, `Complete` completes an existing open and unblocked task once, and `Snooze` replaces the logical reminder using the selected local duration of 15, 30, 60, or 120 minutes; 60 minutes is the default. Both actions dismiss the notification; missing, completed, blocked, and paused-category targets do nothing. A snoozed alarm is projected through the optional daily `HH:mm` quiet-hours window. Notifications addressed to the rule itself and sync are not implemented.

## Principles

- Notifications are opt-in by category and easy to disable.
- A notification explains why it appeared and opens the source record.
- Quiet hours and a global pause always win over a feature reminder.
- No notification contains sensitive note text, transaction descriptions, or raw app-usage detail on a locked screen.
- Every scheduled notification has a stable ID so edits replace rather than duplicate it.

## Notification categories

| Category | Example | Default |
| --- | --- | --- |
| Task reminder | `Pay rent is due tomorrow.` | On after the user creates a reminder. |
| Overdue task | `3 tasks are overdue.` | Off until enabled. |
| Recurring task | `Weekly review is ready.` | On for a created recurrence. |
| Budget threshold | `Food budget reached 80%.` | Off until enabled. |
| Recurring payment | `Subscription is expected in 3 days.` | Off until enabled. |
| App-time goal | `You are near your daily Communication goal.` | Off until enabled. |
| Review prompt | `Your weekly review is ready.` | Off until enabled. |
| Sync status | `Sync needs attention.` | On only for actionable failures. |
| Security/update | `A safe update is ready.` | On for required or security releases. |

## Task reminders

Current Android reminders have a task ID and trigger time. Editing the reminder cancels the old schedule and creates one new schedule. Completing, deleting, or clearing a task reminder cancels it. Startup and device boot reschedule future reminders from stored task data. The notification content intent carries the stable task ID; cold starts use the initial-intent getter, and warm app launches use a native event before the Tasks form loads that task.

The full-product target adds explicit timezone and synced notification state. The current local Task reminders flag, recurring-task reminders flag, quiet-hours pair, recurring-rule reminder time, task dependency condition, and local snooze-duration policy are in app schema 26; broader category automation and timezone contracts remain planned.

The current Android action contract is `Complete`, `Snooze`, or `Open`. Each action carries only the stable local task ID. `Complete` verifies the task exists and is open, then commits the status change once. `Snooze` reads the selected local duration, schedules its projected alarm, and replaces the old schedule before committing the new timestamp. Missing, completed, and paused-category targets are ignored. The full-product target may add recurring notification state and synced notification state later.

## Recurring work

Recurring rules are separate objects from generated tasks, bills, or review prompts. A rule has:

- frequency and timezone;
- start date and optional end condition;
- missed-occurrence policy;
- generated object type;
- notification rule;
- pause/resume state.

The user can edit one occurrence, all future occurrences, or the entire series. The choice is explicit.

## Budget and time automations

Budget alerts compare a current period total with a configured threshold. App-time alerts compare a current daily or weekly total with a configured goal. Calculations run locally and use the user’s selected timezone. If data is stale, the notification says so or is skipped according to the user’s setting.

## Automation rules

The full product may support user-created rules with one trigger, conditions, and one action. Initial supported actions are:

- create a task;
- add a tag;
- schedule a reminder;
- add a transaction draft, never an automatic committed transaction;
- start a review prompt.

Rules cannot silently move money, delete records, send messages, or read app content. Every rule has an enable/disable switch, run history, and a test preview.

## Background execution

Android and iOS background limits can delay work. The product must show `Scheduled`, `Delayed by system`, or `Needs app open` when relevant. A background job must be idempotent and bounded; it must not corrupt data if the OS stops it midway.

## Notification testing

Test timezone changes, daylight-saving changes, reboot, process death, permission denial, duplicate scheduling, edit/delete races, same-day and overnight quiet hours, locale changes, and stale source data.
