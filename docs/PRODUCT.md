# Product

## Vision

Preserve Anki's learning effectiveness and spaced-repetition discipline while making daily vocabulary review clearer, faster, more accessible and more enjoyable.

## Target users

Self-directed learners who value retention and control but find Anki's setup and daily UX too demanding. The primary audience is comfortable with structured vocabulary and wants reliable local data.

## Principles

- Scheduling correctness before rewards or animation.
- Local-first privacy and reliable offline use.
- Low-friction, readable mobile review.
- Progressive power: simple defaults, advanced controls when needed.
- Honest compatibility claims and explicit limitations.

## MVP scope

Phase A: nested decks, notes/cards, vocabulary fields, tags, selectable study directions, SQLite persistence/migrations, FSRS learning/review/lapse scheduling, review history, settings, Android validation and a supported text-card Anki import. The implementation covers global revision settings, full editing of the current vocabulary fields, selectable independent forward/reverse cards, tag assignment and local `.apkg` import with supported scheduling/history preservation. Editing preserves append-only history and resets both direction cards' current FSRS state when the front or back changes; changing the selected directions preserves retained cards and creates fresh cards for newly enabled directions. Complex Anki templates, media import, `.apkg` export and iOS validation are outside the MVP acceptance criteria and remain future work.

Phase B: two intervention experiments around phone use. The intended product behavior is a prompt for three vocabulary reviews after an eligible unlock and five reviews after each eligible three-minute phone-use sequence. These requirements must first be validated against Android and iOS capabilities, permissions, background execution, privacy and store policies. A supported notification, widget or extension may replace direct unlock interception. The interventions must reuse the existing study flow and remain configurable, with explicit behavior when no cards are due or the daily workload is complete.

## Non-goals

No backend, accounts, sync, AI generation, large gamification system, mini-game suite or independent scheduler per exercise type in the MVP.

## Later

Contextual phrases, fill-in-the-blank exercises, challenges, AI-assisted examples/explanations and eventual multi-device sync are roadmap items, not current implementation scope.
