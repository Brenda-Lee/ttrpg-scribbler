import { describe, expect, it } from "vitest";
import {
  LinkedEntitySchema,
  MapDataSchema,
  MarkerSchema,
  parseMapData,
} from "@/types/locationMap";

describe("LinkedEntitySchema", () => {
  it("aceita type válido + id não vazio", () => {
    expect(LinkedEntitySchema.safeParse({ type: "character", id: "abc" }).success).toBe(true);
    expect(LinkedEntitySchema.safeParse({ type: "location", id: "xyz" }).success).toBe(true);
    expect(LinkedEntitySchema.safeParse({ type: "item", id: "k" }).success).toBe(true);
  });

  it("rejeita type inválido", () => {
    expect(
      LinkedEntitySchema.safeParse({ type: "monster", id: "k" }).success,
    ).toBe(false);
  });

  it("rejeita id vazio", () => {
    expect(LinkedEntitySchema.safeParse({ type: "character", id: "" }).success).toBe(false);
  });
});

describe("MarkerSchema", () => {
  it("aceita marker mínimo (sem linkedEntity)", () => {
    const r = MarkerSchema.safeParse({ id: "m1", x: 50, y: 50, label: "portão" });
    expect(r.success).toBe(true);
  });

  it("aceita marker com linkedEntity", () => {
    const r = MarkerSchema.safeParse({
      id: "m2",
      x: 10,
      y: 20,
      label: "Sa'Elis",
      linkedEntity: { type: "character", id: "char-1" },
    });
    expect(r.success).toBe(true);
  });

  it("rejeita coordenadas fora de [0,100]", () => {
    expect(
      MarkerSchema.safeParse({ id: "m", x: -1, y: 50, label: "" }).success,
    ).toBe(false);
    expect(
      MarkerSchema.safeParse({ id: "m", x: 50, y: 101, label: "" }).success,
    ).toBe(false);
  });

  it("aplica default vazio em label ausente", () => {
    const r = MarkerSchema.safeParse({ id: "m", x: 50, y: 50 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.label).toBe("");
  });
});

describe("MapDataSchema / parseMapData", () => {
  it("aceita mapa vazio", () => {
    expect(MapDataSchema.safeParse({}).success).toBe(true);
  });

  it("aceita mapa com imagem e markers", () => {
    const r = MapDataSchema.safeParse({
      imagePath: "/uploads/foo.png",
      markers: [
        { id: "1", x: 10, y: 20, label: "" },
        {
          id: "2",
          x: 30,
          y: 40,
          label: "x",
          linkedEntity: { type: "item", id: "item-1" },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("parseMapData retorna vazio para input não-objeto", () => {
    expect(parseMapData(null)).toEqual({});
    expect(parseMapData("foo")).toEqual({});
    expect(parseMapData(42)).toEqual({});
  });

  it("parseMapData retorna estrutura preservada para input válido", () => {
    const data = { imagePath: "/uploads/a.png", markers: [{ id: "1", x: 0, y: 0, label: "" }] };
    expect(parseMapData(data)).toEqual(data);
  });
});
