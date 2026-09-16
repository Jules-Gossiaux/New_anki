# Changelog

## Unreleased

### Added

- Added global daily review limits and configurable FSRS learning/relearning steps with persistent settings.
- Updated deck new-card counters to show the remaining global daily quota and clarified the deck-card management action label.
- Added readable scheduling details to cards in the editor and an explicit daily-limit message in empty study sessions.
- Updated today's deck counter to show the number of review cards still available under the global daily review limit.
- Added explanations for learning and relearning steps and fixed settings-field editing so intermediate input is preserved.
- Replaced the settings save confirmation dialog with a non-blocking toast.
- Aligned card-editor colors and statuses with the scheduling categories: blue for new cards, red for cards scheduled today, and green for cards scheduled after today.
- Added the first study flow with new/due card selection across nested decks, answer reveal, Again/Hard/Good/Easy ratings and atomic FSRS review persistence.
- Added the pinned `ts-fsrs` 5.4.2 scheduler adapter, persisted scheduler state migration and review-log repository.
- Added FSRS due-time previews below the review buttons and automatic reappearance of short-term learning cards when due.
- Kept all short-term learning cards scheduled for today in the active study queue while excluding cards scheduled for tomorrow; cards become selectable at their exact due time and retain due-time ordering.
- Updated study selection so future cards from today are offered early only after all currently available cards are exhausted; tomorrow's cards remain excluded.

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

- Full note editing, CSV/Anki import-export and `.apkg` compatibility remain incomplete.
- Native iOS SQLite integration still requires device/development-build validation.
- The Expo scaffold reports npm audit warnings that must be reviewed before release; no automatic force-fix was applied.
