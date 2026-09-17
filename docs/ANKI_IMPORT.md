# Anki import contract

Status: first text-card import slice implemented. Image and audio media import is explicitly deferred because Android validation found it unreliable.

## Accepted scope

Import `.apkg` packages locally, without a server. Preserve supported decks and subdecks, text notes, existing card directions, tags, supplementary fields, review history and scheduling information as faithfully as possible. Export remains deferred. Do not generate a reverse card unless it exists in the source package.

Support basic vocabulary templates first. Unsupported cloze cards and advanced templates are skipped with explicit reasons and counts in the import report. A familiar note-type name is not enough to establish compatibility: inspect the fields and template semantics. Show the front/back mapping in the preview when it cannot be established reliably. Preserve additional fields, with their original labels, in the note's extra information.

## Progress and scheduling

The priority is preserving existing learning progress, including the next due date where interpretable. Do not automatically mark previously studied cards as new or reschedule the collection at import.

- Read and validate exported FSRS state when present; determine compatibility with the pinned Vocabulary scheduler before applying it.
- For legacy Anki scheduling, preserve the original history and scheduling metadata. Investigate a supported history-based FSRS conversion; no approximate stability/difficulty formula has been approved or implemented.
- A source file without scheduling information cannot provide the omitted progress. Report this before import. Replacing an existing card from such a file must not silently erase its local progress.
- Report conversion limitations per affected group of cards. Preserving the imported state does not guarantee that future intervals match Anki, since algorithm versions and settings can differ.
- Preserve source date units and day-boundary metadata. Vocabulary currently uses UTC calendar days; the mapping from Anki day boundaries must be explicit and tested before scheduling imports ship.

The user must enable Anki's **Include Scheduling Information** export option to include their progress. **Include Media** is not currently supported: images and audio are ignored. These options are described in the [Anki export manual](https://docs.ankiweb.net/exporting.html). Legacy and modern package variants must be investigated and listed separately in the eventual compatibility matrix.

## Duplicate detection and confirmed replacement

Persist source identity mappings for notes, cards and review events. Re-importing an unchanged package must not duplicate cards or historical events. Determine a collision-safe identity strategy before implementing persistence; note text and deck names alone are not identities.

Offer an explicit replacement preview for matching records. After confirmation, imported content and valid imported scheduling state become authoritative for the matching card, while its local review history remains append-only. Keep import provenance so replacing a scheduling snapshot is distinguishable from a new review. Preserve original imported history without inventing FSRS fields missing from the source or counting import operations as study answers.

Reuse decks with the same full hierarchical path; signal ambiguous matches. Replacing matching cards must not remove unrelated local cards or interpret absence from a partial deck export as a deletion.

## Media and failures

Image and audio media are not imported in the current slice. When the package manifest contains one or more media files, the app stops before import and displays a visible in-app modal explaining that images or other media are not supported yet. Text packages with an empty media manifest still import normally. Media support remains a future feature and must be validated on real Android packages before it is reintroduced.

Validate archives and database content before live writes. Bound decompression and file sizes, prevent archive-path traversal, and do not execute imported HTML/scripts. Commit accepted records atomically; a fatal error or interruption must not expose a partial collection. Report skipped unsupported cards explicitly.

## Implementation sequence and acceptance

1. [x] Inspect upstream package formats and representative fixtures, including exports with/without scheduling and media. Record the supported versions and exact source mappings.
2. [x] Implement a read-only parser and preview/report for supported text notes/cards, unsupported templates, duplicates and scheduling limitations.
3. [x] Add numbered, tested migrations for source mappings, original historical metadata and import provenance.
4. [ ] Complete transactional replacement and add repeat-import, rollback/recovery and scheduling conversion fixtures. The current slice preserves imported review events separately and applies only interpretable card scheduling fields.
5. [ ] Reintroduce image/audio media only after a real Android implementation and fixture-validation plan is approved.
6. [x] Connect local file selection, preview and confirmation to the app; validate import and subsequent study on Android. iOS remains outside current MVP acceptance.

Use fixtures covering FSRS and legacy scheduling, new/learning/review/relearning cards, unsupported suspended/buried/filtered states, timestamp units, midnight/timezone/DST boundaries, malformed archives/SQLite rows, duplicate source IDs and repeat imports. Add media fixtures only when media support is resumed. Do not claim completion from mocked repository tests alone; verify real SQLite migrations, rollback and imported data relationships.

The implementation uses Expo FileSystem, `fflate` for ZIP decoding and `fzstd` for modern Zstandard collections. The current app uses Expo SQLite and `ts-fsrs` 5.4.2. Anki's [deck options documentation](https://docs.ankiweb.net/deck-options.html#fsrs) is a reference for scheduler settings, not proof of an exact conversion. The package must still be tested in an Android development build, including the modern `.anki21b` fixtures.

## Fixture observations

The supplied `Anglais.apkg` is a representative modern package. It contains a compressed `collection.anki21b` alongside a compatibility `collection.anki2` placeholder. After decompression, the collection contains 106 notes, 212 cards and 1,350 review-log entries. Cards are in review state and their `data` includes FSRS-related values such as stability (`s`), difficulty (`d`), desired retention (`dr`), decay (`decay`) and last review time (`lrt`). This fixture is suitable for testing progress preservation, but the exact mapping to the pinned `ts-fsrs` version still requires validation.

The main note type is `Basic Quizlet Extended`. Its fields are `FrontText`, `FrontAudio`, `BackText`, `BackAudio`, `Image` and `Add Reverse`, with two templates named `Normal` and `Reverse`. The importer preserves its text fields and treats the template's `Add Reverse` field as a direction-generation hint rather than as vocabulary content. Its media-oriented fields are currently ignored. The package also demonstrates that modern Anki stores note types, fields, templates and deck metadata in dedicated tables instead of the legacy JSON columns in `col`.

The supplied `Ndls 5eme__décembre__Meest gebruikte woorden - C.apkg` confirms that this is a common collection shape rather than an edge case: it contains 24 notes, 48 cards, 247 review-log entries and the same `Basic Quizlet Extended` note type with `Normal` and `Reverse` templates. Its cards include Anki FSRS data and both directions have separate scheduling state. The importer must therefore support this note type in its first useful slice. Its media-oriented fields are ignored in the current implementation.

Anki review-card `due` values in these modern collections are relative to the collection creation day (`col.crt`), not Unix calendar-day values. The importer converts them to Vocabulary's UTC day representation before storing `due_day`; treating values such as `292` as absolute days would incorrectly make every imported review card overdue.
