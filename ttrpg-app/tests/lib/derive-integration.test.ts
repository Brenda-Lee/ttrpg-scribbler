import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { derive } from "@/lib/sheets/derive";
import type { ConditionInput } from "@/lib/sheets/applyModifiers";
import { parseSheetSchema } from "@/lib/sheets/parser";

const TORMENTA_PATH = path.resolve("prisma/sheets/tormenta20.json");

function loadTormenta20() {
  const raw = JSON.parse(fs.readFileSync(TORMENTA_PATH, "utf-8"));
  return parseSheetSchema(raw);
}

describe("derive (integration) — Tormenta 20 bundled catalog", () => {
  it("derives defesa_efetiva and deslocamento for a character with one SEVERE LEFT_LEG condition", () => {
    const schema = loadTormenta20();

    const base = {
      for: 14,
      des: 16,
      con: 12,
      int: 10,
      sab: 10,
      car: 8,
      defesa_base: 10,
      pv_max: 24,
      pv_atual: 24,
      deslocamento: 9,
      tamanho: "Médio",
    };

    const conditions: ConditionInput[] = [
      { id: "cond-1", region: "LEFT_LEG", severity: "SEVERE" },
    ];

    const { effective, breakdown } = derive(base, conditions, schema);

    expect(effective.defesa_efetiva).toBe(26);
    expect(effective.deslocamento).toBe(6);

    expect(breakdown.deslocamento).toHaveLength(1);
    expect(breakdown.deslocamento[0]).toMatchObject({
      source: "preset",
      delta: -3,
      conditionId: "cond-1",
    });
    expect(breakdown.deslocamento[0].reason).toMatch(/Perna esquerda/);

    const formulaEntry = breakdown.defesa_efetiva.find(
      (b) => b.source === "formula",
    );
    expect(formulaEntry).toBeDefined();
    expect(formulaEntry?.reason).toMatch(/defesa_base/);
  });

  it("stacks the SEVERE LEFT_LEG and SEVERE RIGHT_LEG presets on deslocamento", () => {
    const schema = loadTormenta20();

    const base = {
      for: 14,
      des: 14,
      con: 12,
      int: 10,
      sab: 10,
      car: 10,
      defesa_base: 10,
      pv_max: 24,
      pv_atual: 24,
      deslocamento: 9,
      tamanho: "Médio",
    };

    const conditions: ConditionInput[] = [
      { id: "a", region: "LEFT_LEG", severity: "SEVERE" },
      { id: "b", region: "RIGHT_LEG", severity: "SEVERE" },
    ];

    const { effective, breakdown } = derive(base, conditions, schema);

    expect(effective.deslocamento).toBe(3);
    expect(breakdown.deslocamento).toHaveLength(2);
    expect(breakdown.deslocamento.map((b) => b.conditionId)).toEqual(["a", "b"]);
  });

  it("layers a modifiersJson override on top of a HEAD CRITICAL preset", () => {
    const schema = loadTormenta20();

    const base = {
      for: 10,
      des: 12,
      con: 12,
      int: 14,
      sab: 14,
      car: 10,
      defesa_base: 10,
      pv_max: 18,
      pv_atual: 18,
      deslocamento: 9,
      tamanho: "Médio",
    };

    const conditions: ConditionInput[] = [
      {
        id: "head-1",
        region: "HEAD",
        severity: "CRITICAL",
        modifiersJson: JSON.stringify([
          { field: "car", delta: -1, reason: "Concussão visível" },
        ]),
      },
    ];

    const { effective, breakdown } = derive(base, conditions, schema);

    expect(effective.int).toBe(10);
    expect(effective.sab).toBe(10);
    expect(effective.car).toBe(9);

    const overrideEntry = breakdown.car.find((b) => b.source === "override");
    expect(overrideEntry).toMatchObject({
      delta: -1,
      reason: "Concussão visível",
      conditionId: "head-1",
    });
  });
});
