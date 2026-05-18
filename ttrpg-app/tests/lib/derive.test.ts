import { beforeEach, describe, expect, it } from "vitest";
import {
  __getFormulaCacheStats,
  __resetFormulaCacheStats,
  derive,
} from "@/lib/sheets/derive";
import type { ConditionInput } from "@/lib/sheets/applyModifiers";
import type { SheetSchema } from "@/lib/sheets/types";

function makeSchema(): SheetSchema {
  return {
    systemSlug: "demo",
    schemaVersion: 1,
    sections: [
      {
        id: "attributes",
        title: "Attributes",
        fields: [
          { id: "for", label: "Força", type: "number", default: 10 },
          { id: "des", label: "Destreza", type: "number", default: 10 },
          { id: "defesa_base", label: "Defesa base", type: "number", default: 10 },
          { id: "deslocamento", label: "Deslocamento", type: "number", default: 9 },
          {
            id: "defesa_efetiva",
            label: "Defesa efetiva",
            type: "derived",
            formula: "defesa_base + des",
          },
          {
            id: "ataque",
            label: "Bônus de ataque",
            type: "derived",
            formula: "for + mod(des)",
          },
        ],
      },
    ],
    injuryPresets: [
      {
        region: "LEFT_LEG",
        severity: "SEVERE",
        modifiers: [
          { field: "deslocamento", delta: -3, reason: "Perna esquerda severamente ferida" },
        ],
      },
      {
        region: "RIGHT_ARM",
        severity: "MODERATE",
        modifiers: [{ field: "for", delta: -2, reason: "Braço direito ferido" }],
      },
    ],
  };
}

beforeEach(() => {
  __resetFormulaCacheStats();
});

describe("derive", () => {
  it("evaluates derived fields against the base scope when no conditions are present", () => {
    const schema = makeSchema();
    const base = { for: 12, des: 14, defesa_base: 10, deslocamento: 9 };

    const { effective } = derive(base, [], schema);

    expect(effective.defesa_efetiva).toBe(24);
    expect(effective.ataque).toBe(14);
  });

  it("recomputes a derived field after applyModifiers modifies its base inputs", () => {
    const schema = makeSchema();
    const base = { for: 12, des: 14, defesa_base: 10, deslocamento: 9 };
    const conditions: ConditionInput[] = [
      { id: "c1", region: "RIGHT_ARM", severity: "MODERATE" },
    ];

    const { effective, breakdown } = derive(base, conditions, schema);

    expect(effective.for).toBe(10);
    expect(effective.ataque).toBe(12);
    expect(breakdown.for).toHaveLength(1);
    expect(breakdown.for[0]).toMatchObject({ source: "preset", delta: -2 });
    expect(breakdown.ataque?.at(-1)).toMatchObject({ source: "formula" });
  });

  it("emits a `source: 'formula'` breakdown entry listing the resolved identifier set", () => {
    const schema = makeSchema();
    const base = { for: 12, des: 14, defesa_base: 10, deslocamento: 9 };

    const { breakdown } = derive(base, [], schema);

    const entry = breakdown.defesa_efetiva.find((b) => b.source === "formula");
    expect(entry).toBeDefined();
    expect(entry?.reason).toMatch(/defesa_base/);
    expect(entry?.reason).toMatch(/des/);
  });

  it("propagates NaN through a derived field when a referenced base value is missing", () => {
    const schema = makeSchema();
    const base = { for: 12, defesa_base: 10, deslocamento: 9 } as Record<
      string,
      number
    >;

    const { effective } = derive(base, [], schema);

    expect(Number.isNaN(effective.defesa_efetiva as number)).toBe(true);
    expect(Number.isNaN(effective.ataque as number)).toBe(true);
  });

  it("caches the formula AST per schema instance (cache hits on the second derive call)", () => {
    const schema = makeSchema();
    const base = { for: 12, des: 14, defesa_base: 10, deslocamento: 9 };

    derive(base, [], schema);
    const after_first = __getFormulaCacheStats();
    expect(after_first.parses).toBe(2);
    expect(after_first.hits).toBe(0);

    derive(base, [], schema);
    const after_second = __getFormulaCacheStats();
    expect(after_second.parses).toBe(2); // unchanged: no new parses
    expect(after_second.hits).toBe(2); // both derived fields served from cache
  });

  it("does not share cache entries across distinct SheetSchema instances", () => {
    const base = { for: 12, des: 14, defesa_base: 10, deslocamento: 9 };
    const schemaA = makeSchema();
    const schemaB = makeSchema();

    derive(base, [], schemaA);
    derive(base, [], schemaB);

    const stats = __getFormulaCacheStats();
    expect(stats.parses).toBe(4); // two derived fields x two schemas
    expect(stats.hits).toBe(0);
  });

  it("does not mutate the input base map", () => {
    const schema = makeSchema();
    const base = { for: 12, des: 14, defesa_base: 10, deslocamento: 9 };
    const before = { ...base };

    derive(base, [{ id: "c1", region: "LEFT_LEG", severity: "SEVERE" }], schema);

    expect(base).toEqual(before);
  });

  it("returns deterministic output across repeated calls with the same inputs", () => {
    const schema = makeSchema();
    const base = { for: 12, des: 14, defesa_base: 10, deslocamento: 9 };
    const conditions: ConditionInput[] = [
      { id: "b", region: "RIGHT_ARM", severity: "MODERATE" },
      { id: "a", region: "LEFT_LEG", severity: "SEVERE" },
    ];

    const first = derive(base, conditions, schema);
    const second = derive(base, conditions, schema);

    expect(second.effective).toEqual(first.effective);
    expect(second.breakdown).toEqual(first.breakdown);
  });
});
