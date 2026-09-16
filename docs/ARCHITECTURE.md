# Architecture

## Default shape

Use a modular monolith with explicit boundaries:

```text
src/
  app/             Expo Router routes and providers
  domain/          entities, value objects, scheduler ports, validation
  application/     use cases and orchestration
  infrastructure/  SQLite adapter, migrations, repositories, import/export
  ui/              components, tokens, accessibility and screen composition
  platform/        notifications and opt-in native capability adapters
```

The UI calls application use cases. Use cases depend on domain ports and repository interfaces. Infrastructure implements those interfaces. The FSRS adapter is isolated behind a scheduler port and has no React Native or database dependency.

## Data model direction

Stable UUIDs identify decks, notes, cards, templates and review logs. Decks use a nullable `parent_id` plus an ordering field. A note owns vocabulary content/tags; cards are generated from a note/template and own scheduling state. Review logs are append-only and record the scheduler input, rating, resulting state/interval, timestamps and app/schema versions.

Temporal data is explicit: event timestamps such as `created_at`, `updated_at` and `reviewed_at` are UTC instants. `due_at` stores the exact UTC instant returned by FSRS; `due_day` stores a UTC calendar-day ordinal for day-based review selection. This is deterministic for the current MVP, but local-day and travel/timezone behavior still needs a dedicated product and migration decision before broader compatibility claims.

SQLite is the proposed local store because it gives transactions, migrations, indexes and a future sync-friendly relational model. Repositories own SQL. Schema changes are numbered migrations and tested from a clean database and from the previous migration.

The initial schema is implemented through Expo SQLite and currently contains `decks`, `notes`, `cards`, `review_logs`, `tags`, `note_tags` and `app_settings`. Deck deletion is soft and refuses to delete non-empty decks; foreign keys use restrictive deletion semantics to prevent accidental loss. The migration runner applies each version inside a transaction and records the SQLite `user_version`. Migration 2 adds the persisted FSRS state required to resume scheduling exactly: last review timestamp, scheduled days, elapsed days and learning steps.

Note creation and card creation are orchestrated by an application use case and committed in one SQLite transaction. Repositories remain responsible for SQL and mapping persistence rows to domain types; the UI does not access SQL directly. New cards expose a neutral `new` state until their first review, after which the isolated FSRS adapter persists the resulting scheduling state and review log atomically.

The card editor derives its display category from the same UTC scheduling semantics as deck counters: new cards are blue, non-new cards scheduled today are red, and cards scheduled after today are green. This presentation logic does not alter FSRS state.

Global review settings are stored as validated key/value entries in `app_settings`. Daily new-card and review limits are computed from distinct cards reviewed during the current UTC day, while learning and relearning steps are passed to the pinned FSRS adapter.

## Scheduler

The scheduler receives a card scheduling snapshot, review rating, current instant and settings, and returns a validated scheduling decision plus updated state. The current adapter uses the pinned `ts-fsrs` 5.4.2 implementation with fuzzing disabled for deterministic behavior. Review timestamps are UTC instants; review cards retain an exact UTC due timestamp and a UTC calendar-day ordinal for day-based selection. A review transaction persists the decision and append-only log atomically. A study session loads all cards whose due date belongs to the current UTC day, including future short-term learning cards, but normally presents currently available cards first. Once those are exhausted, it presents the nearest future card from the same UTC day in due-time order. Cards scheduled for the next day are excluded from the session.

## Import/export

CSV is a deliberately limited convenience format. `.apkg` is a ZIP/SQLite/collection-and-media compatibility project and will be staged: inspect/parser spike, read-only import into a quarantine/validation layer, media mapping, export compatibility, then broader fixtures. Compatibility is never claimed from CSV alone.

## Future backend

Repositories and sync records should expose stable IDs, `created_at`, `updated_at`, tombstones and an origin/version strategy. No network code belongs in the MVP. A later sync service can implement the same application ports and conflict policy without changing screens or domain scheduling.

## Agent boundaries

Prefer separate ownership of `domain`, `infrastructure`, `ui/app`, and docs/tooling. Shared contracts are changed first and reviewed. Use worktrees for parallel work and keep migrations, scheduler changes and import formats especially reviewable.
