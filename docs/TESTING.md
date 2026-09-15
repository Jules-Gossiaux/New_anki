# Testing strategy

Tests build confidence in retention behavior and data integrity, not just coverage.

## Layers

- Unit: domain entities, validation, date/interval calculations, FSRS adapter contract and settings.
- Integration: SQLite migrations/repositories, review transaction + history, deck deletion, import validation and persistence.
- UI: React Native Testing Library for create/edit/delete deck/card, study reveal, rating and next-card persistence.
- E2E: introduce later with the critical onboarding, deck creation and review paths; avoid brittle visual assertions.

Every bug should receive a regression test where practical. Scheduler tests must cover all ratings, learning/review/lapse transitions, timezone/date edges and invalid inputs. External FSRS behavior is verified against its documented contract and pinned version.

## Validation record

On 2026-09-14, the current Phase A foundation was manually validated on Android. Deck creation, persistence across relaunch, renaming, nested decks, moving and conservative deletion behaved correctly. The local typecheck, Jest suite, ESLint and Prettier checks also passed. Native iOS validation remains pending because the current development environment is Windows-based.

On 2026-09-15, card management was manually validated on Android. Card creation, persistence after relaunch, confirmed deletion and scrolling through a deck containing more cards than fit on screen behaved correctly.

On 2026-09-15, the study and FSRS flow was validated by automated tests: all four ratings, persisted scheduler state, review-log atomicity and migration behavior passed. On 2026-09-16, automated study-queue tests covered future short-term cards scheduled today, exclusion of tomorrow's cards, exact due-time availability, due-order preservation, early selection only after currently available cards are exhausted, and retention of cards reprogrammed later on the same day. Manual Android validation of deck-to-study navigation, nested-deck study selection, displayed due times and delayed reappearance remains the next validation step. Native iOS validation remains pending.
