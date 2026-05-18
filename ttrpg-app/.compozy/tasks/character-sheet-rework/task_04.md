---
status: completed
title: DB-first schema resolver with bundled fallback
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 04: DB-first schema resolver with bundled fallback

## Overview
Provide the single function every consumer uses to obtain a typed `SheetSchema` for a given `systemSlug`: try `System.rulesJson` from the database first, fall back to the bundled `prisma/sheets/*.json` when the DB value is missing, malformed, or older than the bundled version. Cache the resolved schema in module scope so repeated reads are cheap.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `src/lib/sheets/loadSchema.ts` exporting `loadSheetSchema(systemSlug: string | null): Promise<SheetSchema>`.
- MUST return the `generic` bundled schema when `systemSlug` is `null`.
- MUST query `prisma.system.findUnique({ where: { slug } })` for `rulesJson`; pass it through `parseSheetSchema` from task 03.
- MUST fall back to the bundled JSON for the same `systemSlug` when the DB row is missing, when `rulesJson` is null, when parsing fails, or when the bundled `schemaVersion` is greater.
- MUST emit a `console.warn` summarising the fallback reason (e.g., `"rulesJson invalid for system 'tormenta20', using bundled v1"`).
- MUST cache resolved schemas in a `Map<string, SheetSchema>` keyed by `${systemSlug}:${schemaVersion}`.
- MUST be isomorphic (no Node-only or Next-server-only imports beyond Prisma).
- SHOULD expose `clearSheetSchemaCache()` for use in tests.
</requirements>

## Subtasks
- [x] 4.1 Create `src/lib/sheets/loadSchema.ts` with the resolver and cache.
- [x] 4.2 Bundle the three catalog JSON imports through a small `src/lib/sheets/bundled.ts` that pre-parses them at module load and surfaces a `Record<systemSlug, SheetSchema>`.
- [x] 4.3 Wire the warn log and cache key.
- [x] 4.4 Add a `clearSheetSchemaCache()` test helper export.
- [x] 4.5 Cover the fallback paths and cache behaviour in tests.

## Implementation Details
See TechSpec section "System Architecture → Component Overview" entry for `loadSchema.ts` and ADR-004 for the resolution policy. The Prisma client is already exported via `src/lib/db.ts:5-9`. JSON imports under `tsx`/Next are reliable; if needed, the module can use `fs.readFileSync` for SSR safety, but a typed `import` of the JSON object is preferred since the parser asserts the shape.

### Relevant Files
- `src/lib/sheets/loadSchema.ts` (new) — resolver.
- `src/lib/sheets/bundled.ts` (new) — bundled catalog map.
- `src/lib/sheets/parser.ts` (task 03) — validation entry point.
- `src/lib/sheets/types.ts` (task 03) — type contracts.
- `src/lib/db.ts` — Prisma singleton.
- `prisma/sheets/{generic,dnd-5e,tormenta20}.json` (task 03) — source data.

### Dependent Files
- `app/api/characters/[projectId]/route.ts` (task 09) — calls the resolver to seed defaults on POST.
- `app/api/characters/[projectId]/[characterId]/sheet/route.ts` (task 10) — calls the resolver on GET and PATCH.
- `src/components/characters/sheet/SheetRenderer.tsx` (task 15) — receives the resolved schema as props.

### Related ADRs
- [ADR-004: DB-First Sheet Schema with Bundled JSON Fallback](adrs/adr-004.md) — Drives the resolution policy.

## Deliverables
- `src/lib/sheets/loadSchema.ts` with the cached resolver and a `clearSheetSchemaCache` helper.
- `src/lib/sheets/bundled.ts` exposing pre-parsed bundled catalogs.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering DB lookup + fallback paths **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Returns the bundled `generic` schema when `systemSlug` is `null`.
  - [x] Hits the cache on a second call for the same `(slug, version)` and does not query Prisma a second time (assert via spy/mock).
  - [x] Emits `console.warn` and falls back when `rulesJson` is `null`.
  - [x] Emits `console.warn` and falls back when `rulesJson` is malformed JSON.
  - [x] Emits `console.warn` and falls back when the DB `schemaVersion` is older than the bundled one.
- Integration tests:
  - [x] `tests/lib/loadSchema-integration.test.ts` seeds a System row with valid `rulesJson` and asserts `loadSheetSchema` returns the DB version (not the bundled one).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Cache is per-process and survives the lifetime of a request handler
- `clearSheetSchemaCache()` exists and is used only from tests
