---
status: completed
title: Recursive-descent formula evaluator
type: backend
complexity: medium
dependencies:
  - task_01
---

# Task 05: Recursive-descent formula evaluator

## Overview
Implement the small, dependency-free expression parser and evaluator used by `derived` fields (e.g., `"defesa_base + mod(des)"`). The module is pure and isomorphic so server and client share one code path per ADR-005, and its grammar is strictly whitelisted per ADR-002 to keep the attack surface tiny.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `src/lib/sheets/formula.ts` exporting `parse(expr: string): FormulaNode` and `evaluate(node: FormulaNode, scope: Record<string, number>): number`.
- MUST support numeric literals, identifiers (resolved against `scope`), parenthesised expressions, binary `+ - * /` with standard precedence, and the function set `floor`, `min` (n-ary), `max` (n-ary), `mod`.
- MUST define `mod(attr) = Math.floor((attr - 10) / 2)`.
- MUST throw a descriptive error from `parse` on syntactic problems (unexpected token, mismatched parenthesis, unknown function name).
- MUST return `NaN` from `evaluate` when an identifier is missing from `scope`; do not throw.
- MUST return `NaN` from `evaluate` on division by zero (do not throw).
- MUST NOT use `eval`, `Function`, `with`, or any dynamic code construction.
- SHOULD memoise compiled ASTs at the caller level — the module exposes a stateless API and leaves caching to consumers.
</requirements>

## Subtasks
- [x] 5.1 Implement the tokenizer (numbers, identifiers, operators, parentheses, commas).
- [x] 5.2 Implement the recursive-descent parser producing a `FormulaNode` union.
- [x] 5.3 Implement the evaluator with the four operators and the function table.
- [x] 5.4 Add error messages with the offending position/lexeme.
- [x] 5.5 Cover precedence, associativity, function arity, and error cases in tests.

## Implementation Details
See TechSpec section "Implementation Design → Core Interfaces" for the `FormulaNode` union and the public `parse`/`evaluate` signatures, and ADR-002 for the rationale and grammar scope. The module has no React, no Prisma, no fetch — keep it that way (isomorphic boundary stated in ADR-005).

### Relevant Files
- `src/lib/sheets/formula.ts` (new) — parser and evaluator.

### Dependent Files
- `src/lib/sheets/derive.ts` (task 06) — runs `evaluate` against effective base values.
- `src/lib/sheets/parser.ts` (task 03) — could optionally `parse` formulas at schema-load time as a deeper validation (out of scope for task 03 to avoid the dep cycle).

### Related ADRs
- [ADR-002: Custom Recursive-Descent Formula Evaluator (Zero Dependencies)](adrs/adr-002.md) — Drives grammar and security constraints.
- [ADR-005: Isomorphic Derivation Library with Server-Canonical GET](adrs/adr-005.md) — Drives the no-React/no-Prisma boundary.

## Deliverables
- `src/lib/sheets/formula.ts` with `parse` and `evaluate`.
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for end-to-end expression evaluation **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `parse("1 + 2 * 3")` then `evaluate` returns `7` (precedence).
  - [x] `parse("(1 + 2) * 3")` then `evaluate` returns `9` (parentheses).
  - [x] `parse("mod(des)")` with `scope = { des: 14 }` evaluates to `2`.
  - [x] `parse("defesa_base + mod(des)")` with `{ defesa_base: 10, des: 14 }` evaluates to `12`.
  - [x] `parse("floor(min(10, 5, max(2, 8)))")` evaluates to `5`.
  - [x] `parse("1 / 0")` evaluates to `NaN`.
  - [x] `evaluate` returns `NaN` when an identifier is absent from `scope`.
  - [x] `parse("1 +")` throws with a message that includes "unexpected".
  - [x] `parse("(1 + 2")` throws with a message that includes "parenthesis".
  - [x] `parse("foo(1)")` throws for an unknown function name.
- Integration tests:
  - [x] Parses and evaluates the `defesa_efetiva` formula from `prisma/sheets/tormenta20.json` end-to-end.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `src/lib/sheets/formula.ts` has zero runtime dependencies beyond the standard library
- No use of `eval`, `Function`, or `with`
