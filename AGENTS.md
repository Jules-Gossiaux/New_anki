# AGENTS.md

## 1. Mission

Vocabulary is a local-first vocabulary-learning app for Android and iOS.

The application aims to combine:

- Learning effectiveness.
- Correct FSRS scheduling.
- Anki-compatible data foundations.
- Strong data integrity.
- Accessibility.
- Fast and enjoyable user experience.
- Maintainable architecture.
- Future support for synchronization and backend services.

Priorities, in order:

1. Correctness and data integrity.
2. Learning effectiveness and scheduling correctness.
3. Reliability and maintainability.
4. Accessibility and usability.
5. Performance.
6. Gamification and visual polish.

Do not sacrifice correctness or data integrity for visual polish or speed of implementation.

---

## 2. Product principles

- The app is local-first.
- The MVP does not require a backend.
- The application must remain usable without an internet connection unless a feature explicitly requires network access.
- Do not claim full Anki compatibility unless the relevant compatibility has actually been implemented and tested.
- Do not claim cross-platform phone-use monitoring unless it has been demonstrated on the relevant platforms.
- All review modes must use the same underlying scheduling engine.
- Do not create separate improvised scheduling algorithms for special study modes.
- Clearly distinguish:
  - Confirmed product requirements.
  - Proposed solutions.
  - Technical limitations.
  - Open questions.
  - Future ideas.

Do not remove or silently downgrade a requested feature without documenting the reason.

---

## 3. Before changing code

Before implementing a feature, bug fix or refactor:

1. Read this file.
2. Read the relevant documentation in `docs/`.
3. Check the current Git status.
4. Check the current branch.
5. Check recent commits.
6. Check active worktrees and agent ownership.
7. Inspect the existing implementation before introducing new abstractions.
8. Identify the smallest independently verifiable implementation slice.
9. Identify relevant tests and potential regression risks.
10. Check whether the change affects persistence, migrations, scheduling or imported data.

Do not assume that the current code matches the documentation.

If documentation and code disagree:

- Investigate the difference.
- Do not silently choose one.
- Document the discrepancy.
- Ask for clarification when the decision affects product behavior, data integrity or architecture.

---

## 4. Agent ownership and collaboration

- Never work directly on `main`.
- Use a dedicated branch for each feature, fix or documentation change.
- Recommended branch names:
  - `feat/<area>-<short-name>`
  - `fix/<area>-<short-name>`
  - `docs/<short-name>`
  - `refactor/<area>-<short-name>`
  - `test/<area>-<short-name>`
  - `chore/<short-name>`

Never modify, stage, commit, reset, rebase, merge or delete files belonging to another agent's active worktree or branch.

Before modifying shared files:

- Check whether another agent is working on them.
- Check ownership boundaries.
- Avoid overlapping changes whenever possible.

If ownership is unclear:

- Inspect active worktrees, branches and recent changes.
- Avoid modifying the disputed files.
- Continue with isolated, non-conflicting work when possible.
- Ask for clarification only when progress requires changing the disputed area.

Never:

- Force-push.
- Use destructive Git commands to remove other work.
- Reset another agent's changes.
- Delete another agent's branch or worktree.
- Silently overwrite uncommitted changes.
- Use `git push --force` unless explicitly authorized.

Use worktrees when multiple agents work in parallel.

Any merge or rebase must produce a reviewable change and must not discard another agent's work.

---

## 5. Feature development workflow

For every feature or bug fix:

1. Read `AGENTS.md` and relevant documentation.
2. Check Git status, branch, recent commits and ownership.
3. Inspect existing code and tests.
4. Identify the smallest independently verifiable slice.
5. Identify affected architecture boundaries.
6. Implement the change.
7. Add or update appropriate tests.
8. Run relevant focused tests.
9. Run typecheck.
10. Run the full test suite when practical.
11. Run lint and formatting checks.
12. Review the final diff.
13. Check for unrelated changes.
14. Update documentation when behavior or architecture changes.
15. Update `CHANGELOG.md` for meaningful user-visible changes.
16. Create a focused Conventional Commit, unless the coordinating agent or founder explicitly requests an uncommitted handoff.
17. Report:
    - What changed.
    - What was tested.
    - Which commands were run.
    - Any failures.
    - Known limitations.
    - Any follow-up work.

Do not claim that tests passed if they were not actually run.

Do not mark a feature complete while relevant tests are failing unless the failure is explicitly documented and accepted.

---

## 6. Architecture rules

- Keep domain logic platform-independent.
- Keep scheduling logic free of React Native imports.
- Do not place business logic directly inside UI components.
- UI components must not issue SQL queries.
- Access SQLite only through database adapters and repositories.
- Keep persistence details outside the domain layer.
- Keep notes, cards, decks and review logs as separate concepts.
- Use stable IDs.
- Preserve source-system identifiers or an explicit mapping when importing/exporting external formats such as Anki.
- Use explicit timestamps.
- Avoid duplicate sources of truth.
- Prefer explicit, readable code over clever abstractions.
- Prefer simple architecture that satisfies current requirements.
- Do not introduce abstractions without a concrete use case.
- Do not create generic frameworks or utility layers prematurely.
- Do not add backend infrastructure to the local-first MVP without a documented reason.
- Preserve a reasonable boundary for future synchronization without overengineering for it.

For SQLite-backed features:

- Use transactions for multi-step operations.
- Add indexes based on actual query patterns, especially for deck hierarchy, due cards and update timestamps.
- Keep large reads bounded or paginated where appropriate.
- Do not perform large database work synchronously during UI rendering.

Before adding a dependency:

- Check whether existing dependencies or platform capabilities are sufficient.
- Explain the reason for the dependency.
- Consider bundle size, maintenance, licensing and platform compatibility.
- Do not add a dependency only to avoid a small amount of straightforward code.

---

## 7. TypeScript and code quality

- Keep TypeScript strict.
- Avoid `any`.
- If `any` is unavoidable, document the reason and keep its scope small.
- Prefer precise types and discriminated unions.
- Validate data at external boundaries.
- Do not trust imported files, database contents or external API responses.
- Avoid hidden side effects.
- Keep functions focused.
- Prefer deterministic domain functions where possible.
- Do not suppress TypeScript, lint or test errors without documenting why.
- Do not use `--no-verify` to bypass Git hooks unless explicitly authorized.
- Do not manually edit generated files unless the generating command and review procedure are documented.
- Checked-in generated artifacts such as lockfiles must still be committed when their source configuration changes.

---

## 8. FSRS and scheduling rules

- Use a mature, documented FSRS implementation or a pinned implementation reviewed against a clear contract.
- Never replace FSRS with an ad-hoc scheduler.
- Keep the upstream FSRS implementation or reference identifiable.
- Pin the relevant implementation version.
- Separate:
  - FSRS algorithm behavior.
  - Application-specific review policy.
  - UI study modes.
  - Persistence and review history.

Do not modify without an explicit documented decision:

- FSRS formulas.
- Scheduling semantics.
- Learning-state meanings.
- Lapse behavior.

User-configurable FSRS parameters, including weights when supported by the selected implementation, are allowed only when validated, versioned and covered by tests. Changing a parameter is not the same as changing the FSRS algorithm, but its effect on existing cards must be documented.

Any scheduling change requires focused tests covering, where relevant:

- New cards.
- Learning states.
- Review states.
- Relearning.
- Lapses.
- Intervals.
- Due dates.
- Stability and difficulty.
- Again/Hard/Good/Easy behavior.
- Review history.
- Existing cards.
- Date and timezone boundaries.

Never silently reinterpret or migrate existing scheduling data.

If scheduling behavior changes, document:

- The previous behavior.
- The new behavior.
- The migration impact.
- The expected effect on existing cards.
- The tests validating the change.

---

## 9. Date and time rules

- Use documented timestamp representations and units for each temporal concept.
- Never mix seconds and milliseconds.
- Document timestamp units explicitly.
- Make timezone-dependent behavior explicit.
- Do not rely implicitly on device-local time for scheduling calculations.
- Explicitly distinguish event timestamps (usually UTC instants) from scheduling dates. Define whether due dates represent:
  - Exact instants.
  - Calendar dates.
  - Local-day boundaries.
- Persist the timezone or local-day context when the scheduling contract requires it.
- Handle day boundaries deliberately.
- Test:
  - Midnight.
  - Timezone changes.
  - Daylight-saving-time changes.
  - Long inactivity periods.
  - Clock changes where relevant.
  - Import/export across timezones.

Date and time behavior must be deterministic and testable.

---

## 10. Database and data integrity

- Database schema changes require numbered migrations.
- Every migration requires migration tests.
- Migrations must be safe to run exactly once.
- Document recovery behavior for failed or interrupted migrations.
- Use transactions for multi-step persistence operations.
- Do not silently discard data during migrations.
- Do not silently discard invalid import rows.
- Validate imported data before writing to the database.
- Preserve review history unless explicit product behavior says otherwise.
- Review history is append-only.
- Corrections must be represented as explicit data events or documented mutations.
- Destructive operations must be explicit and tested.
- Define deletion semantics for:
  - Decks.
  - Subdecks.
  - Notes.
  - Cards.
  - Review logs.
  - Tags.
- Avoid cascading deletion unless explicitly intended and documented.
- Never silently delete cards, notes or review history.
- Ensure interrupted writes do not leave inconsistent data.
- For large imports, use a staging area or transaction so partially validated records are never exposed as committed application data.

---

## 11. Import and export

Imported data is untrusted.

Importers must:

- Validate file structure.
- Validate required fields.
- Handle malformed rows.
- Handle duplicate identifiers.
- Handle missing values.
- Avoid silent data loss.
- Report skipped or rejected data.
- Be tested with realistic and malformed files.
- Do not expose partially validated data as committed application data. Large imports may use a staging area or transaction before becoming visible atomically.

Do not claim `.apkg` compatibility unless actual `.apkg` import/export is implemented and tested.

If only CSV, JSON or another format is supported, state that limitation clearly.

Export behavior must be deterministic and documented.

---

## 12. Testing rules

Every observable behavior or data-model change must include appropriate tests unless the change is purely documentary, generated, cosmetic or already covered by existing tests. Document the reason when no new test is added.

Tests should verify:

- User-visible behavior.
- Domain invariants.
- Persistence invariants.
- Scheduling behavior.
- Import/export behavior.
- Error handling.
- Regression cases.

Prefer testing behavior and contracts rather than implementation details.

Important areas requiring strong tests:

- FSRS scheduling.
- Database repositories.
- Migrations.
- Import/export.
- Deck hierarchy.
- Note/card relationships.
- Review history.
- Date and timezone behavior.
- Destructive operations.
- Data validation.

A passing test suite is evidence of tested behavior, not proof that the algorithm or product design is correct.

Every discovered bug should receive a regression test when practical.

---

## 13. Product decisions and ambiguity

Do not invent important product behavior silently.

When requirements are ambiguous:

1. Identify the ambiguity.
2. Explain the possible options.
3. State the trade-offs.
4. Recommend an option when appropriate.
5. Request founder review when the decision affects:
   - Learning effectiveness.
   - FSRS behavior.
   - Data integrity.
   - User trust.
   - Platform permissions.
   - Product scope.
   - Long-term architecture.

Document important decisions in the relevant documentation or ADR.

Do not confuse a technical limitation with a product decision.

Do not add analytics, telemetry, remote logging or external AI processing without an explicit product and privacy decision. Do not log vocabulary content, review history or imported data unnecessarily.

---

## 14. Native platform features

Features involving native platform capabilities must begin with a feasibility investigation when relevant.

Examples:

- Background activity monitoring.
- Phone-unlock behavior.
- Notifications.
- Background tasks.
- Widgets.
- Native permissions.
- Android services.
- iOS restrictions.
- App Store or Play Store policies.
- Expo config plugins.
- Native modules.

The feasibility investigation should identify:

- What is technically possible.
- On which platforms.
- Required permissions.
- Required native code or config plugins.
- Behavior when the app is closed.
- Battery implications.
- Store-policy risks.
- Fallback behavior.

Do not claim cross-platform support based only on theoretical API availability.

---

## 15. Scope discipline

- Implement the smallest useful slice.
- Avoid unrelated refactors.
- Avoid premature optimization.
- Avoid premature gamification.
- Avoid unnecessary animations.
- Avoid introducing architecture only for hypothetical future requirements.
- Do not change unrelated files.
- Do not expand the feature beyond its documented scope without approval.
- Prefer incremental, independently testable changes.

---

## 16. Documentation

Keep documentation synchronized with actual behavior.

Relevant documentation may include:

- `README.md`
- `CHANGELOG.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`
- `docs/DECISIONS.md`

Update documentation when:

- Product behavior changes.
- Architecture changes.
- Database schema changes.
- Scheduling behavior changes.
- Import/export support changes.
- Platform limitations are discovered.
- A significant technical decision is made.

Do not write documentation that claims behavior the code does not provide.

---

## 17. Definition of done

A change is ready for handoff only when:

- The implementation is scoped and understandable.
- Existing behavior was inspected.
- Appropriate tests were added or updated.
- Relevant tests pass.
- Typecheck passes.
- Lint passes, when configured.
- Formatting passes, when configured.
- The diff contains no unrelated changes.
- Documentation is updated when necessary.
- Limitations are explicitly reported.
- The change is committed with a focused Conventional Commit, unless an uncommitted handoff was explicitly requested.
- For persistence, import/export or native-permission changes, invalid data, destructive behavior, recovery and privacy implications were considered.
