# Agent Rules

## Mission

Vocabulary is a local-first, Anki-compatible vocabulary app for Android and iOS. Learning effectiveness, FSRS correctness, data integrity, accessibility and maintainability take priority over gamification or visual polish.

## Before changing code

- Read this file and the relevant documents in `docs/`.
- Check `git status`, the current branch, recent commits and ownership boundaries.
- Do not modify unrelated files or silently overwrite another agent's work.
- State uncertainties in the issue, PR or decision record; investigate before committing to an API or product behavior.

## Architecture rules

- Keep domain and scheduling logic platform-independent and free of React Native imports.
- Access SQLite only through database adapters and repositories; UI components must not issue SQL.
- Keep notes, cards, decks and review logs as separate concepts with stable IDs and timestamps.
- Treat imported data as untrusted and validate it before persistence.
- Preserve an abstraction boundary for future sync; do not add backend infrastructure to the local-first MVP.

## FSRS and data rules

- Use a mature, documented FSRS implementation or a pinned implementation reviewed against its contract. Never replace it with an ad-hoc scheduler.
- Any scheduler change requires focused unit tests for state transitions, intervals, lapses, due dates and timezone/date boundaries.
- Database schema changes require a numbered migration, migration tests and a recovery/rollback note where relevant.
- Review history is append-only. Corrections must be explicit data events, not silent mutation.

## Git and collaboration

- Do not develop directly on `main`; use `feat/<area>-<short-name>`, `fix/<area>-<short-name>`, or `docs/<short-name>` branches.
- Keep commits focused and use Conventional Commit style, for example `feat(scheduler): integrate FSRS review states`.
- Use worktrees when parallel agents would touch overlapping files. Rebase or merge only with an explicit reviewable change.
- Never reset, force-push, or delete work that may belong to another agent.

## Testing and documentation

- Add or update tests with every behavior change, especially domain, persistence and import/export changes.
- Run typecheck, tests, lint and format checks before handoff; report failures honestly.
- Update `CHANGELOG.md` for meaningful changes and the relevant document/ADR when architecture or product behavior changes.
- A passing test suite is evidence of tested behavior, not proof that an algorithm is correct.

## Scope discipline

- Implement the smallest independently verifiable slice.
- Do not claim full Anki `.apkg` compatibility or cross-platform phone-use monitoring without demonstrated support.
- Features requiring native entitlements, config plugins or platform policy review must begin with a feasibility spike.
