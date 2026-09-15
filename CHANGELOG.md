# Changelog

## Unreleased

### Added

- Added the initial Expo SQLite schema and transactional migration runner.
- Added deck and note domain types plus repositories with validation and conservative deletion behavior.
- Added deck management UI for creating, renaming, nesting, moving and deleting empty decks.
- Added migration and repository tests.
- Initialized Expo SDK 57, React Native, TypeScript and Expo Router shell.
- Added agent rules, product, architecture, development, testing, roadmap and decision documentation.
- Added TypeScript, Jest, React Native Testing Library, ESLint and Prettier scripts.
- Added the initial platform feasibility investigation for Android usage access and iOS Screen Time capabilities.

### Technical notes

- Added Metro WebAssembly asset configuration required for Expo SQLite web export.
- Native SQLite integration still requires validation in an Android/iOS development build.
- Android manual validation completed for deck persistence and nested deck management on 2026-09-14.

### Changed

- Clarified the distinction between UTC event timestamps and scheduling due-date semantics.
- Synchronized documented branch conventions with the agent workflow.

### Known limitations

- Cards, FSRS scheduling, review history, full note editing and import/export are not implemented yet.
- Native iOS SQLite integration still requires device/development-build validation.
- The Expo scaffold reports npm audit warnings that must be reviewed before release; no automatic force-fix was applied.
