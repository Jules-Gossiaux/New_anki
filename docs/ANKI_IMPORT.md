# Anki import contract

Status: product requirements accepted; implementation and compatibility validation pending.

## Accepted scope

Import `.apkg` packages locally, without a server. Preserve supported decks and subdecks, notes, existing card directions, tags, supplementary fields, review history, scheduling information and associated media as faithfully as possible. Export remains deferred. Do not generate a reverse card unless it exists in the source package.

Support basic vocabulary templates first. Unsupported cloze cards and advanced templates are skipped with explicit reasons and counts in the import report. A familiar note-type name is not enough to establish compatibility: inspect the fields and template semantics. Show the front/back mapping in the preview when it cannot be established reliably. Preserve additional fields, with their original labels, in the note's extra information.

## Progress and scheduling

The priority is preserving existing learning progress, including the next due date where interpretable. Do not automatically mark previously studied cards as new or reschedule the collection at import.

- Read and validate exported FSRS state when present; determine compatibility with the pinned Vocabulary scheduler before applying it.
- For legacy Anki scheduling, preserve the original history and scheduling metadata. Investigate a supported history-based FSRS conversion; no approximate stability/difficulty formula has been approved or implemented.
- A source file without scheduling information cannot provide the omitted progress. Report this before import. Replacing an existing card from such a file must not silently erase its local progress.
- Report conversion limitations per affected group of cards. Preserving the imported state does not guarantee that future intervals match Anki, since algorithm versions and settings can differ.
- Preserve source date units and day-boundary metadata. Vocabulary currently uses UTC calendar days; the mapping from Anki day boundaries must be explicit and tested before scheduling imports ship.

The user must enable Anki's **Include Scheduling Information** export option to include their progress, and **Include Media** to include local images/audio. These options are described in the [Anki export manual](https://docs.ankiweb.net/exporting.html). Legacy and modern package variants must be investigated and listed separately in the eventual compatibility matrix.

## Duplicate detection and confirmed replacement

Persist source identity mappings for notes, cards and review events. Re-importing an unchanged package must not duplicate cards or historical events. Determine a collision-safe identity strategy before implementing persistence; note text and deck names alone are not identities.

Offer an explicit replacement preview for matching records. After confirmation, imported content and valid imported scheduling state become authoritative for the matching card, while its local review history remains append-only. Keep import provenance so replacing a scheduling snapshot is distinguishable from a new review. Preserve original imported history without inventing FSRS fields missing from the source or counting import operations as study answers.

Reuse decks with the same full hierarchical path; signal ambiguous matches. Replacing matching cards must not remove unrelated local cards or interpret absence from a partial deck export as a deletion.

## Media and failures

Attempt to import and display supported images/audio. Missing or failed media do not prevent importing otherwise valid cards. Show a visible `Le média n'a pas pu être importé` notice on each affected card and include the reason in the report. Keep that diagnostic separate from the user's vocabulary fields.

Validate archives and database content before live writes. Bound decompression and file sizes, prevent archive-path traversal, and do not execute imported HTML/scripts. Stage media and validated records locally. Commit accepted records atomically; a fatal error or interruption must not expose a partial collection. Report skipped unsupported cards and media failures explicitly.

## Implementation sequence and acceptance

1. Inspect upstream package formats and representative fixtures, including exports with/without scheduling and media. Record the supported versions and exact source mappings.
2. Implement a read-only parser and preview/report for supported notes/cards, unsupported templates, duplicates, scheduling limitations and missing media.
3. Add numbered, tested migrations for source mappings, original historical metadata, import provenance and media references. Current schema version 3 has none of these import-specific structures.
4. Implement transactional import and confirmed replacement, with repeat-import tests, rollback/recovery tests, preserved local history and scheduling conversion fixtures.
5. Connect local file selection, preview, confirmation and report to the app; validate import and subsequent study on Android. iOS remains outside current MVP acceptance.

Use fixtures covering FSRS and legacy scheduling, new/learning/review/relearning cards, unsupported suspended/buried/filtered states, timestamp units, midnight/timezone/DST boundaries, malformed archives/SQLite rows, duplicate source IDs, repeat imports and missing media. Do not claim completion from mocked repository tests alone; verify real SQLite migrations, rollback and imported data relationships.

No dependency or conversion policy has been selected by this document. The current app uses Expo SQLite and `ts-fsrs` 5.4.2; file selection, archive decoding and media rendering still need a compatibility investigation. Anki's [deck options documentation](https://docs.ankiweb.net/deck-options.html#fsrs) is a reference for scheduler settings, not proof of an exact conversion.
