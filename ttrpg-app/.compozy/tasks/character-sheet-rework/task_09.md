---
status: completed
title: Extend POST /api/characters to create sheet in transaction
type: backend
complexity: low
dependencies:
  - task_02
  - task_04
---

# Task 09: Extend POST /api/characters to create sheet in transaction

## Overview
Make character creation atomic with sheet creation: every `POST /api/characters/[projectId]` now creates the `Character` and its `CharacterSheet` in a single `prisma.$transaction`, resolving the schema via `loadSheetSchema` and seeding `dataJson` with `extractDefaults`. The existing request shape is unchanged; the response continues to be the created Character.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST update `app/api/characters/[projectId]/route.ts` so the `POST` handler wraps `prisma.character.create` and `prisma.characterSheet.create` in `prisma.$transaction`.
- MUST resolve the project's system slug (via `prisma.project.findUnique` selecting `system.slug`) and pass it to `loadSheetSchema`; pass `null` when the project has no system.
- MUST initialise `CharacterSheet.dataJson` to `JSON.stringify(extractDefaults(schema))`.
- MUST set `CharacterSheet.systemSlug` to the resolved slug (or `"generic"` when none) and `schemaVersion` to the schema's version.
- MUST NOT alter the request Zod schema, the auth/ownership check (`assertProjectOwner`), or the existing response shape.
- SHOULD roll back cleanly when sheet creation fails (transaction guarantees this; assert in tests).
</requirements>

## Subtasks
- [x] 9.1 Resolve `system.slug` for the project inside the route handler.
- [x] 9.2 Load the schema via `loadSheetSchema` and compute `dataJson` via `extractDefaults`.
- [x] 9.3 Wrap both creates in `prisma.$transaction`.
- [x] 9.4 Update the existing API test for this route to also assert the sheet's presence and shape.

## Implementation Details
See TechSpec section "API Endpoints" row 1 and ADR-001. The existing route file lives at `app/api/characters/[projectId]/route.ts`; the Zod schema at lines 6-11 stays as-is. The ownership check pattern (`assertProjectOwner`) is preserved.

### Relevant Files
- `app/api/characters/[projectId]/route.ts` — POST handler with current Zod schema at lines 6-11.
- `src/lib/sheets/loadSchema.ts` (task 04) — schema resolver.
- `src/lib/sheets/defaults.ts` (task 08) — `extractDefaults` helper.
- `src/lib/db.ts` — Prisma singleton.
- `src/lib/auth.ts` — `getCurrentUser` for ownership checks (lines 17-41).

### Dependent Files
- `src/components/characters/CharactersClient.tsx` — issues the POST; no UI change required, but new sheet rows materialise on detail navigation.
- `app/api/characters/[projectId]/[characterId]/sheet/route.ts` (task 10) — GET will find the sheet created here.

### Related ADRs
- [ADR-001: Separate `CharacterSheet` Entity](adrs/adr-001.md) — Drives transactional create.
- [ADR-004: DB-First Sheet Schema with Bundled JSON Fallback](adrs/adr-004.md) — Drives the use of `loadSheetSchema` here.

## Deliverables
- Updated `app/api/characters/[projectId]/route.ts` POST handler.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests verifying transactional behaviour **(REQUIRED)**

## Tests
- Unit tests:
  - [x] POST with valid body returns 200 and the created Character.
  - [x] POST against a non-owned project returns 404 (existing behaviour preserved).
  - [x] POST with invalid body returns 400 with Zod issues.
- Integration tests:
  - [x] `tests/api/characters-post.test.ts` POSTs and then queries the DB to confirm both `Character` and `CharacterSheet` exist and the sheet's `systemSlug` matches the project's system.
  - [x] POSTs against a project with `systemId: null` and asserts the resulting sheet has `systemSlug: "generic"`.
  - [x] Simulates a sheet-creation failure (e.g., via a forced unique violation) and asserts neither Character nor sheet is persisted (transaction rollback).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No regression in the existing POST flow (request and response shapes unchanged)
- Every successful POST results in exactly one matching `CharacterSheet` row
