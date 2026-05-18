---
status: completed
title: Define sheet types, Zod parser, and bundled catalog JSON
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 03: Define sheet types, Zod parser, and bundled catalog JSON

## Overview
Author the canonical shape of a sheet schema as TypeScript types and the Zod parser that validates any incoming `SheetSchema` (whether read from `System.rulesJson` or loaded from disk), and produce the three bundled JSON catalogs (`generic`, `dnd-5e`, `tormenta20`) that ship as the fallback source per ADR-004. This task creates the foundation every later sheet module depends on.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `src/lib/sheets/types.ts` exporting `FieldType`, `SheetField`, `Modifier`, `InjuryPreset`, `SheetSchema`, and `FieldValue` matching TechSpec "Core Interfaces".
- MUST create `src/lib/sheets/parser.ts` exposing `parseSheetSchema(raw: unknown): SheetSchema` backed by Zod, with `.strict()` on every nested object so unknown keys are rejected.
- MUST validate that every `derived` field's `formula` is a non-empty string (full grammar validation is task 05's responsibility).
- MUST validate that every `select` field has a non-empty `options` array.
- MUST validate that every `repeating-list` field carries a non-empty `itemSchema` array of `SheetField`.
- MUST produce three JSON catalog files under `prisma/sheets/`:
  - `prisma/sheets/generic.json` — Identity (free text), 6 numeric attributes, HP, Velocity, Inventory list, Notes.
  - `prisma/sheets/dnd-5e.json` — Identity, Attributes (6), Saving Throws, Skills (18), Combat (CA, HP, Speed), Attacks (repeating), Spells (repeating), Equipment (repeating), Traits (textareas), Proficiencies, plus `injuryPresets` for HEAD/LEG SEVERE+CRITICAL.
  - `prisma/sheets/tormenta20.json` — Identity (Raça, Origem, Classe, Divindade), 6 attributes, Skills with T.A. (repeating), Combat (Defesa base, derived Defesa efetiva, HP, Deslocamento), Attacks (repeating), Spells (repeating by círculo), Equipment (repeating), Notes, plus `injuryPresets`.
- MUST each catalog include `systemSlug` matching the System.slug seeded today (`dnd-5e`, `tormenta20`, `generic`) and `schemaVersion: 1`.
- SHOULD keep each JSON below ~200 lines for readability; defer non-MVP fields to later schemaVersion bumps.
</requirements>

## Subtasks
- [x] 3.1 Author `src/lib/sheets/types.ts` covering every field type and the schema envelope.
- [x] 3.2 Author `src/lib/sheets/parser.ts` with a Zod schema reachable as `SheetSchemaZ` and a `parseSheetSchema()` wrapper that throws with a useful message on failure.
- [x] 3.3 Create `prisma/sheets/generic.json`.
- [x] 3.4 Create `prisma/sheets/dnd-5e.json`.
- [x] 3.5 Create `prisma/sheets/tormenta20.json`.
- [x] 3.6 Verify all three JSON files parse cleanly with `parseSheetSchema()` from a unit test.

## Implementation Details
See TechSpec sections "Implementation Design → Core Interfaces" (the `SheetField`/`SheetSchema` types) and "Schema da ficha (formato em `System.rulesJson`)" in the PRD for the field types and the example Tormenta 20 schema. The PDFs in `sourceMaterial/D&D 5ed - Ficha Editável.pdf` and `sourceMaterial/T20 - Ficha Editável.pdf` are the authoring reference for D&D 5e and Tormenta 20 sections respectively; the catalogs should cover the sections the PRD calls out, not every field on the sheet (defer to later versions).

### Relevant Files
- `src/lib/sheets/types.ts` (new) — type contracts.
- `src/lib/sheets/parser.ts` (new) — Zod parser.
- `prisma/sheets/generic.json` (new).
- `prisma/sheets/dnd-5e.json` (new).
- `prisma/sheets/tormenta20.json` (new).
- `sourceMaterial/D&D 5ed - Ficha Editável.pdf` — authoring reference.
- `sourceMaterial/T20 - Ficha Editável.pdf` — authoring reference.
- `src/lib/bodyRegions.ts` — existing `BODY_REGIONS` and `CONDITION_SEVERITIES` constants reused by `InjuryPreset` validation.

### Dependent Files
- `src/lib/sheets/loadSchema.ts` (task 04) — consumes the parser and catalogs.
- `src/lib/sheets/applyModifiers.ts` and `derive.ts` (task 06) — consume the types.
- `src/lib/sheets/zodFromSchema.ts` (task 07) — consumes the parsed schema.
- `prisma/seed.ts` (task 08) — reads the JSON catalogs to populate `System.rulesJson`.
- `src/components/characters/sheet/**` (tasks 13–15) — render against the types.

### Related ADRs
- [ADR-002: Custom Recursive-Descent Formula Evaluator](adrs/adr-002.md) — Formulas are validated only as non-empty strings here; full grammar check happens in task 05.
- [ADR-004: DB-First Sheet Schema with Bundled JSON Fallback](adrs/adr-004.md) — Bundled catalogs are the fallback source defined here.

## Deliverables
- `src/lib/sheets/types.ts`, `src/lib/sheets/parser.ts`.
- Three `prisma/sheets/*.json` catalogs validated by the parser.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests proving the three bundled catalogs round-trip through the parser **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `tests/lib/sheets-parser.test.ts` accepts a minimal valid schema and returns a typed `SheetSchema`.
  - [x] Rejects a schema with an unknown root key (`.strict()` enforcement).
  - [x] Rejects a `select` field with empty `options`.
  - [x] Rejects a `repeating-list` field with empty `itemSchema`.
  - [x] Rejects a `derived` field with an empty `formula` string.
  - [x] Rejects an `InjuryPreset` with an unknown `region` value not in `BODY_REGIONS`.
- Integration tests:
  - [x] `tests/lib/sheets-catalogs.test.ts` reads each of `prisma/sheets/{generic,dnd-5e,tormenta20}.json` from disk, parses with `parseSheetSchema`, and asserts non-empty sections and at least one `derived` field on D&D 5e and Tormenta 20.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Bundled catalogs are valid against the parser
- D&D 5e and Tormenta 20 catalogs cover the sections enumerated in the PRD "Schema da ficha" section
- Generic catalog renders meaningful content for projects without a system
