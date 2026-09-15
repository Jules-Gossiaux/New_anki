# Changelog

## Unreleased

### Added

- Added a redesigned deck management UI based on the product wireframe: card-based decks, clear primary actions, pencil editing, nested-deck affordance and settings FAB.
- Added a deck screen UI test for the empty state and primary actions.
- Refined the card-management screen to match the deck-list visual language and added confirmed card deletion.
- Made the card-management content vertically scrollable for decks with many cards.
- Added note and basic-card domain models and repositories.
- Added transactional note-plus-card creation through an application use case.
- Added deck detail UI with card creation and vocabulary preview.
- Added repository and application tests for card creation and transactional boundaries.
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
- Android manual validation completed for deck persistence, nested deck management and card management on 2026-09-15.
- Native iOS SQLite validation remains pending.

### Changed

- Clarified the distinction between UTC event timestamps and scheduling due-date semantics.
- Synchronized documented branch conventions with the agent workflow.

### Known limitations

- Cards, FSRS scheduling, review history, full note editing and import/export are not implemented yet.
- Native iOS SQLite integration still requires device/development-build validation.
- The Expo scaffold reports npm audit warnings that must be reviewed before release; no automatic force-fix was applied.
