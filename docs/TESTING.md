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
