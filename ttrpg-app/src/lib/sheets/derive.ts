import { evaluate, parse, type FormulaNode } from "./formula";
import { applyModifiers, type ConditionInput } from "./applyModifiers";
import type {
  BreakdownEntry,
  FieldValue,
  SheetField,
  SheetSchema,
} from "./types";

const formulaCache = new WeakMap<SheetSchema, Map<string, FormulaNode>>();

const cacheStats = {
  parses: 0,
  hits: 0,
};

function getFormulaAst(
  schema: SheetSchema,
  fieldId: string,
  formula: string,
): FormulaNode {
  let perSchema = formulaCache.get(schema);
  if (!perSchema) {
    perSchema = new Map();
    formulaCache.set(schema, perSchema);
  }
  const cached = perSchema.get(fieldId);
  if (cached) {
    cacheStats.hits += 1;
    return cached;
  }
  const node = parse(formula);
  cacheStats.parses += 1;
  perSchema.set(fieldId, node);
  return node;
}

function collectRefs(node: FormulaNode): string[] {
  const refs = new Set<string>();
  function walk(current: FormulaNode): void {
    switch (current.kind) {
      case "num":
        return;
      case "ref":
        refs.add(current.name);
        return;
      case "bin":
        walk(current.left);
        walk(current.right);
        return;
      case "call":
        for (const arg of current.args) walk(arg);
        return;
    }
  }
  walk(node);
  return Array.from(refs);
}

function* iterDerived(schema: SheetSchema): Generator<SheetField> {
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === "derived" && field.formula) {
        yield field;
      }
    }
  }
}

export interface DeriveResult {
  effective: Record<string, FieldValue>;
  breakdown: Record<string, BreakdownEntry[]>;
}

export function derive(
  base: Record<string, FieldValue>,
  conditions: readonly ConditionInput[],
  schema: SheetSchema,
): DeriveResult {
  const { values, breakdown } = applyModifiers(base, conditions, schema);
  const effective: Record<string, FieldValue> = { ...values };

  for (const field of iterDerived(schema)) {
    const node = getFormulaAst(schema, field.id, field.formula!);
    const scope: Record<string, number> = {};
    for (const [key, value] of Object.entries(effective)) {
      if (typeof value === "number") scope[key] = value;
    }
    const result = evaluate(node, scope);
    effective[field.id] = result;

    const refs = collectRefs(node);
    if (!breakdown[field.id]) breakdown[field.id] = [];
    breakdown[field.id].push({
      source: "formula",
      reason: refs.length > 0 ? `from ${refs.join(", ")}` : undefined,
    });
  }

  return { effective, breakdown };
}

// Internal helpers exposed for tests only.
export function __getFormulaCacheStats(): Readonly<typeof cacheStats> {
  return { ...cacheStats };
}

export function __resetFormulaCacheStats(): void {
  cacheStats.parses = 0;
  cacheStats.hits = 0;
}
