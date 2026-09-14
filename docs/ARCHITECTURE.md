# Architecture proposal

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

Temporal data is explicit: event timestamps such as `created_at`, `updated_at` and `reviewed_at` are UTC instants, while a card's due value follows the selected FSRS implementation's contract and may represent a scheduling instant, a calendar day or a local-day boundary. The representation, unit and timezone context are documented in the schema and tested around midnight, timezone changes and daylight-saving transitions.

SQLite is the proposed local store because it gives transactions, migrations, indexes and a future sync-friendly relational model. Repositories own SQL. Schema changes are numbered migrations and tested from a clean database and from the previous migration.

The initial schema is implemented through Expo SQLite and currently contains `decks`, `notes`, `cards`, `review_logs`, `tags`, `note_tags` and `app_settings`. Deck deletion is soft and refuses to delete non-empty decks; foreign keys use restrictive deletion semantics to prevent accidental loss. The migration runner applies each version inside a transaction and records the SQLite `user_version`.

Note creation and card creation are orchestrated by an application use case and committed in one SQLite transaction. Repositories remain responsible for SQL and mapping persistence rows to domain types; the UI does not access SQL directly. Cards currently expose a neutral `new` state and no scheduling behavior until the FSRS adapter is introduced.

## Scheduler

The scheduler receives a card scheduling snapshot, review rating, current instant and settings, and returns a validated scheduling decision plus updated state. It must use a pinned mature FSRS implementation, with contract tests around learning steps, reviews, lapses, intervals and due boundaries. A review transaction persists the decision and log atomically.

## Import/export

CSV is a deliberately limited convenience format. `.apkg` is a ZIP/SQLite/collection-and-media compatibility project and will be staged: inspect/parser spike, read-only import into a quarantine/validation layer, media mapping, export compatibility, then broader fixtures. Compatibility is never claimed from CSV alone.

## Future backend

Repositories and sync records should expose stable IDs, `created_at`, `updated_at`, tombstones and an origin/version strategy. No network code belongs in the MVP. A later sync service can implement the same application ports and conflict policy without changing screens or domain scheduling.

## Agent boundaries

Prefer separate ownership of `domain`, `infrastructure`, `ui/app`, and docs/tooling. Shared contracts are changed first and reviewed. Use worktrees for parallel work and keep migrations, scheduler changes and import formats especially reviewable.
