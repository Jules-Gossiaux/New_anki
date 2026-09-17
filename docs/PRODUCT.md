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

Phase B: polished study flow, restrained transitions, progress feedback, accessibility, and a technically honest intervention experiment for unlock/phone-use reminders.

## Non-goals

No backend, accounts, sync, AI generation, large gamification system, mini-game suite or independent scheduler per exercise type in the MVP.

## Later

Contextual phrases, fill-in-the-blank exercises, challenges, AI-assisted examples/explanations and eventual multi-device sync are roadmap items, not current implementation scope.
