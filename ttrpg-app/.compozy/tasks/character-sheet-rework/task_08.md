---
status: completed
title: Update seed to populate rulesJson and backfill sheets
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 08: Update seed to populate rulesJson and backfill sheets

## Overview
Extend `prisma/seed.ts` so the `D&D 5e` and `Tormenta 20` systems carry their bundled `SheetSchema` as `System.rulesJson`, and every character in the demo project receives a `CharacterSheet` with defaults derived from the schema. The seed must remain idempotent: re-running without `--reset` should not duplicate or overwrite data unnecessarily.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST read `prisma/sheets/dnd-5e.json` and `prisma/sheets/tormenta20.json` from disk in `prisma/seed.ts` (the seed already runs under `tsx`).
- MUST write the JSON content as a string into `System.rulesJson` for each system at creation time.
- MUST create a `CharacterSheet` for every Character created in the demo project, with `dataJson` initialised from the schema's field defaults (using a small `extractDefaults(schema)` helper that returns `Record<fieldId, FieldValue>`).
- MUST include `systemSlug: "generic"` for any character belonging to a project with no `systemId` (none currently in seed, but the helper must support it).
- MUST be idempotent under repeat runs: do not duplicate sheets; if a character already has a sheet, skip insert.
- MUST keep the existing `--reset` flag behaviour intact.
- SHOULD add a brief inline note pointing to `prisma/sheets/README.md` (a one-line README authored alongside) explaining that the JSON files are the source of truth and must bump `schemaVersion` when shape changes.
</requirements>

## Subtasks
- [x] 8.1 Read the bundled JSON catalogs from disk in `prisma/seed.ts`.
- [x] 8.2 Pass each catalog as a string to `System.create({ data: { ..., rulesJson } })`.
- [x] 8.3 Implement `extractDefaults(schema)` either inline in the seed or as a helper exported from `src/lib/sheets/defaults.ts` (preferred — reused by task 09).
- [x] 8.4 After creating each demo Character, create a CharacterSheet referencing the right `systemSlug` and `dataJson`.
- [x] 8.5 Guard inserts with a "skip if already exists" check.
- [x] 8.6 Add `prisma/sheets/README.md` explaining the source-of-truth contract.

## Implementation Details
See TechSpec section "Migrations & backfill" and ADR-001 for the 1:1 contract. The current seed creates systems at `prisma/seed.ts:44-50` and characters at `prisma/seed.ts:68-96`. The `extractDefaults` helper is small enough to live in `src/lib/sheets/defaults.ts` and is reused by task 09 (POST /api/characters).

### Relevant Files
- `prisma/seed.ts` — current systems creation lines 44-50; characters creation lines 68-96.
- `prisma/sheets/{generic,dnd-5e,tormenta20}.json` (task 03) — source JSON.
- `src/lib/sheets/defaults.ts` (new) — `extractDefaults(schema)` helper.
- `src/lib/sheets/types.ts` (task 03) — `SheetSchema`, `FieldValue`.
- `prisma/sheets/README.md` (new) — source-of-truth note.

### Dependent Files
- `app/api/characters/[projectId]/route.ts` (task 09) — calls the same `extractDefaults` helper.
- Local development databases — running `npm run db:reset && npm run db:seed` produces a usable demo with sheets.

### Related ADRs
- [ADR-001: Separate `CharacterSheet` Entity](adrs/adr-001.md) — 1:1 contract enforced by the seed.
- [ADR-004: DB-First Sheet Schema with Bundled JSON Fallback](adrs/adr-004.md) — Seed is the primary way the DB and bundled JSON stay aligned.

## Deliverables
- Updated `prisma/seed.ts` populating `rulesJson` and creating CharacterSheets.
- New `src/lib/sheets/defaults.ts` exporting `extractDefaults(schema)`.
- New `prisma/sheets/README.md` source-of-truth note.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests verifying a fresh seed produces matched sheets **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `tests/lib/defaults.test.ts` extracts defaults from a minimal schema and returns the expected `{fieldId: value}` map.
  - [x] Handles `repeating-list` defaults as `[]` when no `default` is declared.
  - [x] Skips `derived` fields entirely (they have no base value).
- Integration tests:
  - [x] `tests/api/seed-shape.test.ts` runs the seed against a fresh test DB and asserts every demo character has exactly one CharacterSheet with `systemSlug` matching its project's system slug.
  - [x] Re-running the seed without `--reset` does not create a second sheet for any character (idempotency).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `npm run db:reset && npm run db:seed` ends with every demo character having a sheet
- `System.rulesJson` is valid against `parseSheetSchema` for both seeded systems
- Repeated `npm run db:seed` runs do not duplicate sheets
