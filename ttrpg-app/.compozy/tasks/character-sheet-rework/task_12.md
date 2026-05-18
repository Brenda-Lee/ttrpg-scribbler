---
status: completed
title: Extract useDebouncedAutosave hook from TiptapEditor
type: refactor
complexity: low
dependencies:
  - task_01
---

# Task 12: Extract useDebouncedAutosave hook from TiptapEditor

## Overview
Lift the inline 800 ms autosave timer from `TiptapEditor.tsx:85-108` into a reusable `useDebouncedAutosave` hook so the new `SheetRenderer` (task 15) and any future editor reuse one timer/cancel/status pattern. The refactor must be behaviour-preserving in the scene editor.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `src/hooks/useDebouncedAutosave.ts` exporting `useDebouncedAutosave<T>({ delayMs, onSave, onStatus })` returning `{ schedule(value: T), flush(), cancel() }`.
- MUST call `onSave(value)` once per quiet period (default 800 ms) and surface `"saving" | "saved" | "error"` via `onStatus`.
- MUST cancel pending timers on unmount.
- MUST refactor `src/components/editor/TiptapEditor.tsx` to use the hook in place of its inline `setTimeout` block (lines 85-108).
- MUST preserve existing zustand interactions: `setSaveStatus`, `setLastSavedAt`, `bumpHistory` in `src/stores/workspace.ts:7,16-19,56,58`.
- MUST NOT alter the PATCH payload sent by `TiptapEditor` to `/api/scenes/[sceneId]`.
- SHOULD expose `flush()` so a caller can persist immediately on intentional save events (e.g., manual save buttons).
</requirements>

## Subtasks
- [x] 12.1 Author `src/hooks/useDebouncedAutosave.ts`.
- [x] 12.2 Refactor `TiptapEditor.tsx` to consume the hook.
- [x] 12.3 Confirm no behavioural change with the existing scene autosave path.
- [x] 12.4 Cover schedule/flush/cancel and timer cleanup in tests.

## Implementation Details
See TechSpec section "UI → Form da ficha — autosave" for the contract this hook fulfills. The existing inline pattern uses a `useRef<setTimeout|null>` and clears it on each new keystroke; the hook replicates this plus exposes a `flush()` to drain the pending value synchronously. Vitest fake timers (`vi.useFakeTimers()`) are the recommended testing approach for the timing assertions.

### Relevant Files
- `src/hooks/useDebouncedAutosave.ts` (new).
- `src/components/editor/TiptapEditor.tsx` — current debounce at lines 85-108, status calls at 83, 99-106.
- `src/stores/workspace.ts` — `SaveStatus` at line 7, setters at lines 56, 58.

### Dependent Files
- `src/components/characters/sheet/SheetRenderer.tsx` (task 15) — consumes the hook for per-sheet autosave.

### Related ADRs
- [ADR-003: Adopt React Hook Form for Dynamic Sheet Rendering](adrs/adr-003.md) — Pairs with the hook for field-level subscriptions plus debounced server writes.

## Deliverables
- `src/hooks/useDebouncedAutosave.ts`.
- Updated `src/components/editor/TiptapEditor.tsx` using the hook.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests verifying scene autosave still triggers one PATCH per quiet period **(REQUIRED)**

## Tests
- Unit tests:
  - [x] Hook fires `onSave` exactly once after `delayMs` of inactivity following multiple `schedule()` calls.
  - [x] `cancel()` prevents the pending save from firing.
  - [x] `flush()` invokes `onSave` immediately and resets the timer.
  - [x] On unmount, no pending timer fires.
  - [x] `onStatus` transitions saving → saved on a successful `onSave`.
  - [x] `onStatus` transitions saving → error when `onSave` throws.
- Integration tests:
  - [x] `tests/components/TiptapEditor.test.tsx` (jsdom) types text, advances fake timers by 800 ms, and asserts exactly one PATCH was issued (use `vi.spyOn(global, "fetch")`).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Scene autosave behaviour is unchanged from the user's perspective
- Hook is independently importable from `@/hooks/useDebouncedAutosave`
