# Accessibility and localization

Status: Required full-product quality bar.

## Accessibility

### Interaction

- Support Android TalkBack and iOS VoiceOver for supported screens.
- Give every icon button a label and every data value a unit and period.
- Announce save, delete, sync, import, and permission results.
- Preserve focus after validation, navigation, and list updates.
- Provide non-gesture alternatives for swipe, drag, and long-press actions.
- Use at least 44 dp/pt touch targets and adequate spacing.

### Visual and cognitive support

- Support system font scaling without clipped or hidden content.
- Do not use color alone for type, priority, status, or budget state.
- Support dark theme and high-contrast-friendly colors.
- Reduce animation when the platform requests reduced motion.
- Use short labels, predictable layout, and one primary action per screen.
- Provide confirmation and undo for destructive or high-impact actions.

### Data presentation

Money values include currency and sign. Durations include a unit. Dates include a readable label when a list crosses periods. Charts have a table or text summary equivalent.

## Localization

The app must separate user text from code and support plural rules, gender-neutral wording, and right-to-left layout where applicable. No date, number, currency, or week calculation may rely on string parsing.

### Locale-sensitive values

- currency symbol, code, decimal separator, and minor-unit display;
- number grouping and negative formatting;
- date and time formats;
- first day of week;
- relative time labels;
- plural forms for tasks, entries, files, and minutes;
- timezone names and daylight-saving changes.

### Translation process

1. Add stable message IDs with context.
2. Provide a complete default-language string.
3. Mark variables and examples.
4. Run pseudo-localization for expansion and RTL checks.
5. Review sensitive wording for permission, deletion, money, and sync states.

The initial language set is an open product decision. English is the development source language until that decision changes.

## Accessibility and localization gates

Every release tests the main flows with a screen reader, large text, dark theme, RTL layout, pseudo-localized strings, a non-default currency, a daylight-saving boundary, and a locale whose week starts on a different day.

