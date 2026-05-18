---
status: completed
title: Modifier merger and derivation orchestrator
type: backend
complexity: medium
dependencies:
  - task_03
  - task_05
---

# Task 06: Modifier merger and derivation orchestrator

## Overview
Combine the system's `injuryPresets`, the per-condition `modifiersJson` overrides, and the field formulas into a single pure function used by both the server (in GET `/sheet`) and the client (live preview in `SheetRenderer`). This is the isomorphic core promised by ADR-005.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `src/lib/sheets/applyModifiers.ts` exporting `applyModifiers(base, conditions, schema): { values, breakdown }` where `values` is the post-modifier numeric field map and `breakdown[fieldId]` is the ordered list of `BreakdownEntry` items consumed by the UI tooltip.
- MUST create `src/lib/sheets/derive.ts` exporting `derive(base, conditions, schema): { effective, breakdown }` that runs `applyModifiers` first and then evaluates every `derived` field against the modified `values` using `evaluate` from task 05.
- MUST iterate the conditions array in stable order (id ascending) so the breakdown is deterministic across renders.
- MUST emit a `BreakdownEntry` of `source: "preset"` for each preset match and `source: "override"` for each entry in `modifiersJson`; both include the originating `conditionId`, `delta`, and `reason` (falling back to the system label `"<region> <severity>"` when no reason is supplied).
- MUST emit a `BreakdownEntry` of `source: "formula"` for each `derived` field listing the resolved formula identifier set so the UI can show "from FOR + DES".
- MUST NOT mutate `base`; return a new `values` object.
- MUST treat string/boolean/array fields as opaque (modifiers only apply to numeric fields).
- MUST handle unknown referenced field ids in modifiers by emitting a `BreakdownEntry` with `reason: "missing_field"` and otherwise no-op.
- SHOULD be safe to call from both Node and jsdom (no globals beyond `Math`).
</requirements>

## Subtasks
- [x] 6.1 Implement `applyModifiers.ts` and the `BreakdownEntry` type re-exported from `types.ts` (or co-located).
- [x] 6.2 Implement `derive.ts` orchestrating modifier merge + formula evaluation.
- [x] 6.3 Compile and cache the formula ASTs per `SheetSchema` instance (`WeakMap<SheetSchema, Map<fieldId, FormulaNode>>`).
- [x] 6.4 Cover preset+override stacking, ordering, NaN propagation, and unknown-field handling in tests.

## Implementation Details
See TechSpec section "Implementation Design → Core Interfaces" for the `derive` and `BreakdownEntry` signatures, and ADR-005 for the isomorphic boundary. `applyModifiers` reads `schema.injuryPresets` to find rows matching each `(condition.region, condition.severity)` pair and applies their `Modifier[]`; it then layers each condition's `modifiersJson` (parsed via Zod inline) on top.

### Relevant Files
- `src/lib/sheets/applyModifiers.ts` (new) — modifier merging.
- `src/lib/sheets/derive.ts` (new) — orchestration.
- `src/lib/sheets/formula.ts` (task 05) — formula evaluation.
- `src/lib/sheets/types.ts` (task 03) — type contracts and `Modifier`/`InjuryPreset` shapes.
- `src/lib/bodyRegions.ts` — `BODY_REGIONS`, `CONDITION_SEVERITIES` (existing).

### Dependent Files
- `app/api/characters/[projectId]/[characterId]/sheet/route.ts` (task 10) — server caller.
- `src/components/characters/sheet/SheetRenderer.tsx` (task 15) — client caller via `useMemo`.

### Related ADRs
- [ADR-002: Custom Recursive-Descent Formula Evaluator](adrs/adr-002.md) — Drives the formula evaluation step.
- [ADR-005: Isomorphic Derivation Library with Server-Canonical GET](adrs/adr-005.md) — Drives the pure-function constraint.

## Deliverables
- `src/lib/sheets/applyModifiers.ts` and `src/lib/sheets/derive.ts`.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering preset+override stacking against the bundled Tormenta 20 catalog **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Single `SEVERE` `LEFT_LEG` condition applies the matching preset delta to `deslocamento`.
  - [x] Two conditions on the same field stack additively and produce two breakdown entries in id order.
  - [x] A `modifiersJson` override adds an entry tagged `source: "override"` alongside any matching preset.
  - [x] `derive` recomputes a `derived` field after `applyModifiers` modifies its base inputs.
  - [x] Unknown field id in `modifiersJson` produces a `reason: "missing_field"` entry and no value change.
  - [x] Formula AST cache hits on the second `derive` call for the same `schema`.
- Integration tests:
  - [x] `tests/lib/derive-integration.test.ts` loads `prisma/sheets/tormenta20.json` via the parser and computes effective `defesa_efetiva` and `deslocamento` for a fixture character with one SEVERE LEFT_LEG condition.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `derive` is deterministic for fixed inputs
- No mutation of input `base` map
