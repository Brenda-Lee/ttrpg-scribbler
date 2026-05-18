---
status: completed
title: SheetRenderer with RHF, autosave, and live derivation
type: frontend
complexity: high
dependencies:
  - task_06
  - task_07
  - task_12
  - task_13
  - task_14
---

# Task 15: SheetRenderer with RHF, autosave, and live derivation

## Overview
Build the orchestrator component that ties everything together: receives `{ schema, base, effective, breakdown, conditions }` from the server, sets up `useForm` with a `zodResolver` built from the dynamic schema, renders sections and fields via the primitives from tasks 13 and 14, recomputes derivations locally on every change, and persists patches via `useDebouncedAutosave`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `src/components/characters/sheet/SheetRenderer.tsx` accepting props `{ projectId, characterId, schema, base, effective, breakdown, conditions }`.
- MUST initialise RHF with `useForm({ defaultValues: base, resolver: zodResolver(buildResolverSchema(schema)) })`.
- MUST render each `SheetSchema.sections[]` with a heading and a grid of fields; choose the field component by `field.type` (Text/Textarea/Number/Checkbox/Select/Derived/RepeatingList).
- MUST recompute `derive(currentBase, conditions, schema)` in `useMemo` against the RHF `watch()` output, and feed the resulting `effective`/`breakdown` into `DerivedField` instances.
- MUST debounce PATCH submissions via `useDebouncedAutosave` (task 12) at 800 ms; submit only the diff against the last persisted base (top-level keys whose value changed).
- MUST surface save status through `useWorkspace.setSaveStatus` / `setLastSavedAt` (existing zustand slice) so the top-bar indicator reflects sheet edits.
- MUST handle PATCH errors by transitioning status to `"error"` and surfacing a `sonner` toast (`toast.error("Failed to save sheet")`).
- MUST NOT include the BodyMap or the Resumo tab — they are wired in task 16.
- SHOULD memoise the resolver schema, the formula ASTs, and the breakdown maps so typing in one field does not re-derive O(N) of unaffected sections.
</requirements>

## Subtasks
- [x] 15.1 Build `SheetRenderer` skeleton with sections and field dispatch by `type`.
- [x] 15.2 Wire RHF `useForm` with the dynamic resolver and `base` defaults.
- [x] 15.3 Hook `watch()` into a memoised `derive` call; feed the result into `DerivedField`s.
- [x] 15.4 Compute the per-tick top-level diff and pass it to `useDebouncedAutosave.schedule`.
- [x] 15.5 PATCH `/api/characters/[projectId]/[characterId]/sheet`; on success, transition status and update the "last persisted base" reference.
- [x] 15.6 Cover initial render, edit-and-autosave, derived-field recompute, and error handling in tests.

## Implementation Details
See TechSpec section "System Architecture → Data Flow" (steps 1–2) and ADR-005 for the canonical-on-GET + recompute-locally policy. The `useDebouncedAutosave` hook handles timing/status; the renderer is responsible for choosing what to send. Diffing is shallow at the top level — the entire array of a `repeating-list` field is sent when any inner cell changes (matches the server merge semantics in task 10).

### Relevant Files
- `src/components/characters/sheet/SheetRenderer.tsx` (new).
- `src/components/characters/sheet/fields/*.tsx` (tasks 13, 14).
- `src/lib/sheets/derive.ts` (task 06).
- `src/lib/sheets/zodFromSchema.ts` (task 07).
- `src/hooks/useDebouncedAutosave.ts` (task 12).
- `src/stores/workspace.ts` — `setSaveStatus`, `setLastSavedAt` (lines 56, 58).
- `app/api/characters/[projectId]/[characterId]/sheet/route.ts` (task 10) — PATCH endpoint.

### Dependent Files
- `src/components/characters/CharacterDetailClient.tsx` (task 16) — mounts the renderer in the "Ficha" tab.

### Related ADRs
- [ADR-003: Adopt React Hook Form](adrs/adr-003.md) — Drives the form integration.
- [ADR-005: Isomorphic Derivation Library](adrs/adr-005.md) — Drives the live recompute.
- [ADR-006: Dynamic Zod Validator](adrs/adr-006.md) — Drives the resolver schema.

## Deliverables
- `SheetRenderer.tsx`.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering full edit→autosave→derive cycle **(REQUIRED)**

## Tests
- Unit tests (jsdom):
  - [x] Renders every section heading from `schema.sections`.
  - [x] Renders the right component for each field `type`.
  - [x] Editing a base field updates the corresponding `DerivedField` value before any network call.
  - [x] Editing a field triggers exactly one PATCH after 800 ms of inactivity (fake timers; spy on `fetch`).
  - [x] On PATCH success, save status transitions saving → saved and `setLastSavedAt` is called.
  - [x] On PATCH error, save status transitions to error and `toast.error` is invoked.
- Integration tests:
  - [x] `tests/components/SheetRenderer.test.tsx` mounts with a Tormenta-20-like fixture, types into `des`, advances timers, asserts one PATCH whose body contains only `{ patch: { des: <new value> } }`, and asserts `defesa_efetiva` recomputed in the rendered DOM before the network call.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Typing in any field does not re-render every section (verified via React profiler or render-count assertions)
- PATCH payloads only contain changed top-level keys
- Save status indicator stays in sync with the actual server state
