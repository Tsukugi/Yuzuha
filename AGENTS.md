# Yuzuha agent instructions

Use simple wording. Do not claim that a feature exists until the implementation and tests prove it.

## Project rules

1. Yuzuha is an Android-first React Native app with a dual-platform native shell. The product tracks money, app time, notes, and tasks.
2. The native shell includes an embedded installer. At startup it must check the bundle version, download a newer verified release when one is available, and only then present `MainApp`.
3. The baseline is React Native 0.83.0, TypeScript, Metro, and the bundled React Native CLI. This is the stable version recorded for January 2026. Record any version change in the release notes and decision log.
4. Keep `README.md`, this file, and the whole `docs/` tree current when features, configuration, or release behavior changes.
5. Any change to startup, bundle caching, or installer metadata must update `docs/installer.md` and the relevant developer note in `docs/architecture.md`, `docs/testing.md`, or `docs/release.md`.

## Work style

- Reproduce a bug with a test before fixing it.
- For improvements, inspect the implementation first and explain the current behavior before changing it.
- Do not use blind fixes, recovery fixes, or vague best-effort behavior. Define a deterministic rule and test it.
- When planning, challenge the assumptions using the review questions in `docs/product-plan.md`.
- Prefer small, typed modules with clear ownership.

## Current repository status

The repository is a starter shell. It has package and Metro configuration, but no `src/` implementation or native project yet. The documentation describes the target product and an implementation plan; it does not imply that the target features are already built.

