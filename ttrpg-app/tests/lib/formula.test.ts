import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { evaluate, parse } from "@/lib/sheets/formula";
import { parseSheetSchema } from "@/lib/sheets/parser";

function evalExpr(expr: string, scope: Record<string, number> = {}): number {
  return evaluate(parse(expr), scope);
}

describe("formula.parse + evaluate — arithmetic", () => {
  it("respects standard operator precedence", () => {
    expect(evalExpr("1 + 2 * 3")).toBe(7);
  });

  it("honours parentheses", () => {
    expect(evalExpr("(1 + 2) * 3")).toBe(9);
  });

  it("supports left-associative subtraction", () => {
    expect(evalExpr("10 - 3 - 2")).toBe(5);
  });

  it("supports unary minus", () => {
    expect(evalExpr("-5 + 8")).toBe(3);
    expect(evalExpr("-(2 + 3)")).toBe(-5);
  });

  it("handles decimal literals", () => {
    expect(evalExpr("0.5 + 1.5")).toBe(2);
  });

  it("returns NaN on division by zero", () => {
    expect(evalExpr("1 / 0")).toBeNaN();
  });
});

describe("formula.parse + evaluate — references and functions", () => {
  it("evaluates `mod(des)` to floor((des - 10) / 2)", () => {
    expect(evalExpr("mod(des)", { des: 14 })).toBe(2);
    expect(evalExpr("mod(des)", { des: 9 })).toBe(-1);
    expect(evalExpr("mod(des)", { des: 18 })).toBe(4);
  });

  it("evaluates `defesa_base + mod(des)` from a scope", () => {
    expect(evalExpr("defesa_base + mod(des)", { defesa_base: 10, des: 14 })).toBe(12);
  });

  it("evaluates nested floor/min/max calls", () => {
    expect(evalExpr("floor(min(10, 5, max(2, 8)))")).toBe(5);
  });

  it("returns NaN when an identifier is missing from scope", () => {
    expect(evalExpr("mod(does_not_exist)")).toBeNaN();
    expect(evalExpr("a + b", { a: 1 })).toBeNaN();
  });
});

describe("formula.parse — error cases", () => {
  it("throws with 'unexpected' for an incomplete expression", () => {
    expect(() => parse("1 +")).toThrow(/unexpected/);
  });

  it("throws with 'parenthesis' for an unclosed parenthesis", () => {
    expect(() => parse("(1 + 2")).toThrow(/parenthesis/);
  });

  it("throws for an unknown function name", () => {
    expect(() => parse("foo(1)")).toThrow(/unknown function/);
  });

  it("throws for an unexpected character", () => {
    expect(() => parse("1 % 2")).toThrow(/unexpected character/);
  });

  it("throws when floor/mod receive the wrong arity", () => {
    expect(() => parse("floor(1, 2)")).toThrow(/1 argument/);
    expect(() => parse("mod()")).toThrow(/1 argument/);
  });

  it("throws when min/max receive too few arguments", () => {
    expect(() => parse("min(1)")).toThrow(/2 or more/);
    expect(() => parse("max()")).toThrow(/2 or more/);
  });

  it("throws when trailing tokens remain after the expression", () => {
    expect(() => parse("1 2")).toThrow(/unexpected token/);
  });
});

describe("formula — security boundary", () => {
  it("the formula module source contains no `eval(`, `Function(`, or `with (` constructions", () => {
    const source = fs.readFileSync(
      path.resolve("src/lib/sheets/formula.ts"),
      "utf-8",
    );
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toMatch(/\bnew\s+Function\b/);
    expect(source).not.toMatch(/\bwith\s*\(/);
  });
});

describe("formula — integration with bundled Tormenta 20 catalog", () => {
  it("parses and evaluates the defesa_efetiva derived formula", () => {
    const raw = fs.readFileSync(
      path.resolve("prisma/sheets/tormenta20.json"),
      "utf-8",
    );
    const schema = parseSheetSchema(JSON.parse(raw));
    const combat = schema.sections.find((s) => s.id === "combat")!;
    const defesa = combat.fields.find((f) => f.id === "defesa_efetiva")!;
    expect(defesa.type).toBe("derived");
    expect(defesa.formula).toBeDefined();

    const node = parse(defesa.formula!);
    const value = evaluate(node, { defesa_base: 10, des: 3 });
    expect(value).toBe(13);
  });
});
