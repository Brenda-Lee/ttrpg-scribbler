---
status: completed
title: Dynamic Zod patch-schema generator
type: backend
complexity: medium
dependencies:
  - task_03
---

# Task 07: Dynamic Zod patch-schema generator

## Overview
Generate a strict Zod validator for `PATCH /sheet` request bodies at request time, derived from the active `SheetSchema`. This is the server-side guard that ensures only known keys with correctly typed values land in `dataJson`, and it doubles as the form resolver on the client (ADR-006).

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `src/lib/sheets/zodFromSchema.ts` exporting `buildPatchSchema(schema: SheetSchema): z.ZodType<SheetPatch>` and `buildResolverSchema(schema: SheetSchema): z.ZodType<SheetFormValues>`.
- MUST map `text` and `textarea` to `z.string()`, `number` to `z.number()` (use `z.coerce.number()` for the form resolver only), `checkbox` to `z.boolean()`, `select` to `z.enum([...options])`, `derived` to a rejected key (not patchable).
- MUST map `repeating-list` to `z.array(z.object({ ... }).strict())` recursively.
- MUST wrap the root object with `.strict()` so unknown top-level keys fail validation.
- MUST make all top-level properties optional for `buildPatchSchema` (the server accepts partial patches) and required-with-defaults for `buildResolverSchema` (the client form starts with defaults populated).
- MUST cache compiled schemas in a `Map<string, z.ZodType>` keyed by `${systemSlug}:${schemaVersion}`.
- SHOULD expose `clearZodSchemaCache()` for test isolation.
</requirements>

## Subtasks
- [x] 7.1 Implement field-to-Zod mapping covering all `FieldType` variants except `derived` (which is rejected in `buildPatchSchema` and read-only in `buildResolverSchema`).
- [x] 7.2 Wrap object roots with `.strict()` at every nesting level (including `repeating-list` items).
- [x] 7.3 Cache compiled schemas; expose `clearZodSchemaCache()`.
- [x] 7.4 Cover happy paths, type mismatches, unknown keys, nested arrays, and cache behaviour in tests.

## Implementation Details
See TechSpec section "API Endpoints" for the PATCH contract (`{ patch: Record<string, FieldValue> }`) and ADR-006 for the rationale. The generated schemas accept the raw JSON shape; on the server, validation errors surface as 400 with `parsed.error.issues` consistent with the existing pattern in `app/api/glossary/[projectId]/route.ts:7-20`.

### Relevant Files
- `src/lib/sheets/zodFromSchema.ts` (new) — generator + cache.
- `src/lib/sheets/types.ts` (task 03) — `SheetSchema`, `SheetField`, `FieldType`.
- `src/lib/sheets/parser.ts` (task 03) — produces the input schema.

### Dependent Files
- `app/api/characters/[projectId]/[characterId]/sheet/route.ts` (task 10) — calls `buildPatchSchema` on every PATCH.
- `src/components/characters/sheet/SheetRenderer.tsx` (task 15) — calls `buildResolverSchema` once per mount for `zodResolver`.

### Related ADRs
- [ADR-006: Dynamically-Generated Zod Validator for Sheet PATCH](adrs/adr-006.md) — Drives the strict-mode policy and the dynamic generation approach.

## Deliverables
- `src/lib/sheets/zodFromSchema.ts` with cache and helpers.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests against the bundled D&D 5e catalog **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Accepts a partial patch carrying a single valid `text` field.
  - [x] Rejects a patch containing a top-level key not in the schema (`.strict()`).
  - [x] Rejects a patch where a `number` field is sent as a string (server flavour).
  - [x] Rejects a `select` field value not in the declared `options`.
  - [x] Validates a nested `repeating-list` item and rejects unknown keys inside the item.
  - [x] `buildPatchSchema` rejects keys typed `derived` (read-only).
  - [x] `buildResolverSchema` accepts strings for `number` fields and coerces (client flavour).
  - [x] Cache hit returns the same Zod instance for repeated calls with the same `(slug, version)`.
- Integration tests:
  - [x] `tests/lib/zodFromSchema-integration.test.ts` builds the patch schema for `prisma/sheets/dnd-5e.json` and accepts a realistic patch covering nested `attacks[]`, `spells[]`, and `equipment[]` updates.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `.strict()` rejects unknown keys at every nesting level
- Cache hit rate is 100% on repeated calls within the same process
