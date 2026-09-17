# Testing strategy

Tests build confidence in retention behavior and data integrity, not just coverage.

## Layers

- Unit: domain entities, validation, date/interval calculations, FSRS adapter contract and settings.
- Integration: SQLite migrations/repositories, review transaction + history, deck deletion, import validation and persistence.
- UI: React Native Testing Library for create/edit/delete deck/card, study reveal, rating and next-card persistence.
- E2E: introduce later with the critical onboarding, deck creation and review paths; avoid brittle visual assertions.

Every bug should receive a regression test where practical. Scheduler tests must cover all ratings, learning/review/lapse transitions, timezone/date edges and invalid inputs. External FSRS behavior is verified against its documented contract and pinned version.

## Validation record

On 2026-09-14, the current Phase A foundation was manually validated on Android. Deck creation, persistence across relaunch, renaming, nested decks, moving and conservative deletion behaved correctly. The local typecheck, Jest suite, ESLint and Prettier checks also passed. Native iOS validation is outside the MVP acceptance criteria and deferred.

On 2026-09-15, card management was manually validated on Android. Card creation, persistence after relaunch, confirmed deletion and scrolling through a deck containing more cards than fit on screen behaved correctly.

On 2026-09-17, recursive deck deletion was manually validated on Android. A populated parent deck with nested sub-decks and cards could be deleted from the deck editor; the full deck subtree and its cards disappeared from the active views, while the operation remained compatible with the existing soft-delete and history-preservation model.

On 2026-09-16, the card editor was manually revalidated on Android after the modal layout fix. The editor opens without a visible transition glitch, keeps its fields inside one bounded scrollable panel, preserves keyboard scrolling, and refreshes note/tag content after saving without returning to the home screen.

The template direction flow was also manually validated on Android: a new note defaults to both directions, forward-only and reverse-only each create one studyable card, switching to both preserves the existing direction's FSRS state while initializing only the newly added direction, and removing a direction leaves its review history preserved.

On 2026-09-15, the study and FSRS flow was validated by automated tests: all four ratings, persisted scheduler state, review-log atomicity and migration behavior passed. On 2026-09-16, automated study-queue tests covered future short-term cards scheduled today, exclusion of tomorrow's cards, exact due-time availability, due-order preservation, early selection only after currently available cards are exhausted, and retention of cards reprogrammed later on the same day. Manual Android validation of deck-to-study navigation, nested-deck study selection, displayed due times and delayed reappearance remains the next validation step. iOS validation is deferred outside the MVP.

On 2026-09-16, card-editor status categories were covered by unit tests for new cards, cards scheduled later today and cards scheduled after today. The editor and deck list use the same UTC scheduling classification. Manual Android validation of returning from study to both screens is still required; the current fix reloads both screens on navigation focus.

Phase A is complete for the accepted MVP scope. The supported text-card Anki import is covered by archive, normalization, migration, UI-warning and persistence tests; Android validation confirmed local package selection and the explicit media-package warning. Global revision settings are implemented and covered by settings-repository, validation, UI-input and daily-limit tests. Full editing of the current fields, independent forward/reverse card templates and normalized tag assignment are covered by application and domain/repository tests. Native iOS validation remains outside the MVP acceptance criteria.

The editor's category and human-readable schedule display are covered by card-status tests; daily-limit exhaustion and remaining-new-card quota are covered by study-queue tests.
