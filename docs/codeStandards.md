# Code standards

Status: Required for implementation.

## General rules

- Use simple names and small functions.
- Keep business rules out of JSX.
- Prefer explicit types over clever inference at module boundaries.
- Do not hide errors with empty `catch` blocks or silent defaults.
- Do not add a fallback unless its trigger and result are documented and tested.

## TypeScript

- Keep `strict: true`.
- Use `unknown` for untrusted JSON, then validate it.
- Define input and output types for repositories, native adapters, and installer results.
- Use discriminated unions for states and errors.
- Avoid `any`; if a platform API needs it, isolate it in an adapter and explain why.
- Keep date, money, and identifier helpers in `src/shared`.

## React Native

- Components render state; hooks or use cases perform actions.
- Keep screens thin and feature-owned.
- Use stable keys and memoization only when measurement shows a need.
- Handle loading, empty, error, and success states explicitly.
- Use accessible labels, roles, hints, and live announcements for important updates.
- Avoid platform-specific code in shared feature modules. Put it behind `src/platform`.

## Data and security

- Use parameterized database queries.
- Store money as integer minor units.
- Store UTC timestamps and document local-day conversion.
- Never log note text, transaction descriptions, amounts, package names, or export data.
- Validate remote installer metadata before it reaches activation code.

## Naming and layout

- Components: `PascalCase.tsx`.
- Hooks: `useThing.ts`.
- Pure helpers: `thing.ts`.
- Tests: `thing.test.ts` or `ThingScreen.test.tsx`.
- Feature folders own their public screen and use cases.
- Use path aliases only when they make ownership clearer.

## Commits and reviews

Use small imperative commits, for example `Add money entry repository`. A review should check behavior, tests, migration safety, accessibility, privacy, and installer impact. If startup, bundle caching, or metadata changes, the review must include the related `installer.md` update.

