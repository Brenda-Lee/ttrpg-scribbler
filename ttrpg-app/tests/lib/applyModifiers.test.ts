import { describe, expect, it } from "vitest";
import { applyModifiers, type ConditionInput } from "@/lib/sheets/applyModifiers";
import type { SheetSchema } from "@/lib/sheets/types";

function makeSchema(): SheetSchema {
  return {
    systemSlug: "demo",
    schemaVersion: 1,
    sections: [
      {
        id: "stats",
        title: "Stats",
        fields: [
          { id: "deslocamento", label: "Deslocamento", type: "number", default: 9 },
          { id: "int", label: "Int", type: "number", default: 10 },
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
        region: "RIGHT_LEG",
        severity: "SEVERE",
        modifiers: [
          { field: "deslocamento", delta: -3, reason: "Perna direita severamente ferida" },
        ],
      },
      {
        region: "HEAD",
        severity: "SEVERE",
        modifiers: [{ field: "int", delta: -2, reason: "Cabeça severamente ferida" }],
      },
    ],
  };
}

describe("applyModifiers", () => {
  it("applies a single preset to a numeric base field", () => {
    const schema = makeSchema();
    const base = { deslocamento: 9, int: 14 };
    const conditions: ConditionInput[] = [
      { id: "c1", region: "LEFT_LEG", severity: "SEVERE" },
    ];

    const { values, breakdown } = applyModifiers(base, conditions, schema);

    expect(values.deslocamento).toBe(6);
    expect(values.int).toBe(14);
    expect(breakdown.deslocamento).toHaveLength(1);
    expect(breakdown.deslocamento[0]).toMatchObject({
      source: "preset",
      delta: -3,
      conditionId: "c1",
    });
    expect(breakdown.deslocamento[0].reason).toMatch(/Perna esquerda/);
  });

  it("stacks deltas additively across multiple conditions", () => {
    const schema = makeSchema();
    const base = { deslocamento: 9, int: 14 };
    const conditions: ConditionInput[] = [
      { id: "a", region: "LEFT_LEG", severity: "SEVERE" },
      { id: "b", region: "RIGHT_LEG", severity: "SEVERE" },
    ];

    const { values, breakdown } = applyModifiers(base, conditions, schema);

    expect(values.deslocamento).toBe(3);
    expect(breakdown.deslocamento).toHaveLength(2);
    expect(breakdown.deslocamento[0].conditionId).toBe("a");
    expect(breakdown.deslocamento[1].conditionId).toBe("b");
  });

  it("sorts conditions by id ascending for stable breakdown order", () => {
    const schema = makeSchema();
    const base = { deslocamento: 9, int: 14 };
    const conditions: ConditionInput[] = [
      { id: "z", region: "RIGHT_LEG", severity: "SEVERE" },
      { id: "a", region: "LEFT_LEG", severity: "SEVERE" },
    ];

    const { breakdown } = applyModifiers(base, conditions, schema);

    expect(breakdown.deslocamento[0].conditionId).toBe("a");
    expect(breakdown.deslocamento[1].conditionId).toBe("z");
  });

  it("layers `modifiersJson` overrides on top of preset entries", () => {
    const schema = makeSchema();
    const base = { deslocamento: 9, int: 14 };
    const conditions: ConditionInput[] = [
      {
        id: "c1",
        region: "LEFT_LEG",
        severity: "SEVERE",
        modifiersJson: JSON.stringify([
          { field: "int", delta: -1, reason: "Mancando" },
        ]),
      },
    ];

    const { values, breakdown } = applyModifiers(base, conditions, schema);

    expect(values.deslocamento).toBe(6);
    expect(values.int).toBe(13);
    expect(breakdown.int).toHaveLength(1);
    expect(breakdown.int[0]).toMatchObject({
      source: "override",
      delta: -1,
      reason: "Mancando",
      conditionId: "c1",
    });
  });

  it("emits `reason: 'missing_field'` for an unknown field id and does not change values", () => {
    const schema = makeSchema();
    const base = { deslocamento: 9, int: 14 };
    const conditions: ConditionInput[] = [
      {
        id: "c1",
        region: "LEFT_LEG",
        severity: "SEVERE",
        modifiersJson: JSON.stringify([{ field: "nope", delta: -5 }]),
      },
    ];

    const { values, breakdown } = applyModifiers(base, conditions, schema);

    expect(values).not.toHaveProperty("nope");
    expect(breakdown.nope).toHaveLength(1);
    expect(breakdown.nope[0].reason).toBe("missing_field");
  });

  it("emits `reason: 'missing_field'` when the field exists but is non-numeric", () => {
    const schema = makeSchema();
    const base = { deslocamento: "muito" as unknown as number, int: 14 };
    const conditions: ConditionInput[] = [
      { id: "c1", region: "LEFT_LEG", severity: "SEVERE" },
    ];

    const { values, breakdown } = applyModifiers(base, conditions, schema);

    expect(values.deslocamento).toBe("muito");
    expect(breakdown.deslocamento[0].reason).toBe("missing_field");
  });

  it("ignores malformed `modifiersJson` silently", () => {
    const schema = makeSchema();
    const base = { deslocamento: 9, int: 14 };
    const conditions: ConditionInput[] = [
      {
        id: "c1",
        region: "LEFT_LEG",
        severity: "SEVERE",
        modifiersJson: "{not json",
      },
    ];

    const result = applyModifiers(base, conditions, schema);
    // Preset still applies, overrides quietly skipped.
    expect(result.values.deslocamento).toBe(6);
    expect(result.breakdown.deslocamento).toHaveLength(1);
    expect(result.breakdown.deslocamento[0].source).toBe("preset");
  });

  it("does not mutate the input base map", () => {
    const schema = makeSchema();
    const base = { deslocamento: 9, int: 14 };
    const conditions: ConditionInput[] = [
      { id: "c1", region: "LEFT_LEG", severity: "SEVERE" },
    ];

    const before = { ...base };
    applyModifiers(base, conditions, schema);

    expect(base).toEqual(before);
  });

  it("falls back to region+severity label when a modifier has no `reason`", () => {
    const schema = makeSchema();
    schema.injuryPresets[0].modifiers[0].reason = undefined;

    const base = { deslocamento: 9, int: 14 };
    const conditions: ConditionInput[] = [
      { id: "c1", region: "LEFT_LEG", severity: "SEVERE" },
    ];

    const { breakdown } = applyModifiers(base, conditions, schema);

    expect(breakdown.deslocamento[0].reason).toMatch(/Perna esquerda/);
    expect(breakdown.deslocamento[0].reason).toMatch(/Severa/);
  });

  it("returns an empty breakdown when no conditions are supplied", () => {
    const schema = makeSchema();
    const result = applyModifiers({ deslocamento: 9, int: 14 }, [], schema);

    expect(result.values).toEqual({ deslocamento: 9, int: 14 });
    expect(result.breakdown).toEqual({});
  });
});
