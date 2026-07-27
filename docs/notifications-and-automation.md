# Notifications and automation

Status: Android task reminders are implemented; broader notification and automation capability remains planned.

## Current Android scope

The current release supports one optional local reminder on each open task. The user enters `YYYY-MM-DDTHH:mm`, grants Android notification permission when needed, and the app schedules one stable task ID with `AlarmManager`. Startup and device boot rebuild future schedules. Completing, deleting, clearing, or replacing a reminder cancels the old schedule. The notification text is privacy-safe and opens Yuzuha; quiet hours, snooze, action buttons, recurring-rule notifications, and sync are not implemented.

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

Current Android reminders have a task ID and trigger time. Editing the reminder cancels the old schedule and creates one new schedule. Completing, deleting, or clearing a task reminder cancels it. Startup and device boot reschedule future reminders from stored task data.

The full-product target adds explicit timezone, notification category, snooze policy, quiet hours, and action buttons. Those fields are not in schema 17.

Actions are `Complete`, `Snooze`, and `Open`. Actions must verify the task still exists and is in the expected state before applying.

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

Test timezone changes, daylight-saving changes, reboot, process death, permission denial, duplicate scheduling, edit/delete races, quiet hours, locale changes, and stale source data.
